import { useEffect, useState } from 'react'
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore'
import { getFirestoreDb } from './firebase.js'
import { normalizePhoneNumber, parseUsersCsv } from './userCsv.js'

function getCompleteUsers(users) {
  const completeUsers = users.filter(
    (user) =>
      user.name.trim() &&
      user.mobileNumber.trim() &&
      user.tableNumber.trim() &&
      normalizePhoneNumber(user.mobileNumber),
  )

  return completeUsers
}

function displayField(value) {
  return value === undefined || value === null || value === '' ? '—' : String(value)
}

function toCsvCell(value) {
  const cell = value === undefined || value === null ? '' : String(value)
  return `"${cell.replaceAll('"', '""')}"`
}

function createUsersCsv(users) {
  const headers = [
    ['Staff No', 'staffNo', 'no'],
    ['Name', 'name'],
    ['Mobile Number', 'mobileNumber', 'phoneNumber'],
    ['Table Number', 'tableNumber'],
    ['TnG', 'tng'],
    ['Redeem Code', 'redeemCode', 'prize'],
    ['Eligible', 'eligible'],
    ['Checked In', 'checkedIn'],
  ]

  return [
    headers.map(([label]) => toCsvCell(label)).join(','),
    ...users.map((user) =>
      headers
        .map(([, ...fieldNames]) => {
          const fieldName = fieldNames.find((field) => user[field] !== undefined)
          return toCsvCell(fieldName ? user[fieldName] : '')
        })
        .join(','),
    ),
  ].join('\r\n')
}

async function readFirestoreUsers() {
  const db = getFirestoreDb()
  const snapshot = await getDocs(collection(db, 'users'))
  return snapshot.docs.map((userDocument) => ({
    id: userDocument.id,
    ...userDocument.data(),
  }))
}

function Admin() {
  const [users, setUsers] = useState(null)
  const [firestoreUsers, setFirestoreUsers] = useState([])
  const [skippedCount, setSkippedCount] = useState(0)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [firestoreError, setFirestoreError] = useState('')
  const [status, setStatus] = useState('')
  const [isUploading, setIsUploading] = useState(false)
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [isDeletingUsers, setIsDeletingUsers] = useState(false)

  async function refreshFirestoreUsers() {
    setIsLoadingUsers(true)
    setFirestoreError('')
    try {
      setFirestoreUsers(await readFirestoreUsers())
    } catch (readError) {
      console.error('Could not read users from Firestore:', readError)
      setFirestoreError(
        readError instanceof Error
          ? `Could not load users from Firestore: ${readError.message}`
          : 'Could not load users from Firestore.',
      )
    } finally {
      setIsLoadingUsers(false)
    }
  }

  useEffect(() => {
    let isCurrent = true

    async function loadFirestoreUsers() {
      try {
        setFirestoreUsers(await readFirestoreUsers())
      } catch (readError) {
        console.error('Could not read users from Firestore:', readError)
        if (isCurrent) {
          setFirestoreError(
            readError instanceof Error
              ? `Could not load users from Firestore: ${readError.message}`
              : 'Could not load users from Firestore.',
          )
        }
      } finally {
        if (isCurrent) setIsLoadingUsers(false)
      }
    }

    loadFirestoreUsers()
    return () => {
      isCurrent = false
    }
  }, [])

  async function handleFileChange(event) {
    const file = event.target.files?.[0]
    setUsers(null)
    setSkippedCount(0)
    setFileName('')
    setError('')
    setStatus('')

    if (!file) return
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Choose a .csv file to upload.')
      return
    }

    try {
      const parsedUsers = parseUsersCsv(await file.text())
      const completeUsers = getCompleteUsers(parsedUsers)
      setUsers(completeUsers)
      setSkippedCount(parsedUsers.length - completeUsers.length)
      setFileName(file.name)
    } catch (fileError) {
      console.error('Could not read user CSV:', fileError)
      setError(fileError instanceof Error ? fileError.message : 'Could not read the CSV file.')
    }
  }

  async function handleSubmit(event) {
    event.preventDefault()
    if (!users || isUploading) return

    setError('')
    setStatus('')
    setIsUploading(true)
    let uploadedCount = 0

    try {
      const db = getFirestoreDb()
      const usersCollection = collection(db, 'users')

      for (let offset = 0; offset < users.length; offset += 500) {
        const batch = writeBatch(db)
        const batchUsers = users.slice(offset, offset + 500)

        for (const user of batchUsers) {
          batch.set(doc(usersCollection), user)
        }

        await batch.commit()
        uploadedCount += batchUsers.length
      }

      setStatus(`Added ${uploadedCount} users to Firestore with new document IDs.`)
      await refreshFirestoreUsers()
    } catch (uploadError) {
      console.error('Could not upload users to Firestore:', uploadError)
      const reason =
        uploadError instanceof Error ? uploadError.message : 'An unknown error occurred.'
      setError(
        uploadedCount
          ? `Added ${uploadedCount} of ${users.length} users, but the upload could not finish: ${reason}`
          : `Upload failed: ${reason}`,
      )
    } finally {
      setIsUploading(false)
    }
  }

  async function handleDeleteAllUsers() {
    const userCount = firestoreUsers.length
    if (
      userCount === 0 ||
      !window.confirm(
        `Permanently delete all ${userCount} documents in the Firestore users collection? This cannot be undone.`,
      )
    ) {
      return
    }

    setFirestoreError('')
    setStatus('')
    setIsDeletingUsers(true)
    let deletedCount = 0
    try {
      const db = getFirestoreDb()
      const snapshot = await getDocs(collection(db, 'users'))

      for (let offset = 0; offset < snapshot.docs.length; offset += 500) {
        const batch = writeBatch(db)
        const batchDocuments = snapshot.docs.slice(offset, offset + 500)
        for (const userDocument of batchDocuments) {
          batch.delete(userDocument.ref)
        }
        await batch.commit()
        deletedCount += batchDocuments.length
      }

      setFirestoreUsers([])
      setStatus(`Deleted ${deletedCount} documents from the Firestore users collection.`)
    } catch (deleteError) {
      console.error('Could not delete Firestore users collection documents:', deleteError)
      setFirestoreError(
        deleteError instanceof Error
          ? `Deleted ${deletedCount} documents, but could not finish clearing the users collection: ${deleteError.message}`
          : `Deleted ${deletedCount} documents, but could not finish clearing the users collection.`,
      )
      await refreshFirestoreUsers()
    } finally {
      setIsDeletingUsers(false)
    }
  }

  function handleDownloadCsv() {
    try {
      const csv = `\uFEFF${createUsersCsv(firestoreUsers)}`
      const downloadUrl = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = 'firestore-users.csv'
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(downloadUrl)
    } catch (downloadError) {
      console.error('Could not create users CSV download:', downloadError)
      setFirestoreError(
        downloadError instanceof Error
          ? `Could not download users as CSV: ${downloadError.message}`
          : 'Could not download users as CSV.',
      )
    }
  }

  return (
    <main className="admin-page">
      <section className="admin-panel" aria-labelledby="admin-title">
        <h1 id="admin-title">Admin: User & Reward Management</h1>
        <p>Upload users from a CSV and view the records currently stored in database.</p>
        <form className="admin-form" onSubmit={handleSubmit}>
          <label htmlFor="user-csv">User CSV file</label>
          <input
            id="user-csv"
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          {users && (
            <p className="admin-file-summary">
              {fileName}: {users.length} complete user{users.length === 1 ? '' : 's'} ready to
              upload; {skippedCount} incomplete row{skippedCount === 1 ? '' : 's'} will be ignored.
              {users.length > 0 && ' Each uploaded user will get a new Firestore document.'}
            </p>
          )}
          <button type="submit" disabled={!users?.length || isUploading}>
            {isUploading ? 'Uploading…' : 'Save to Database'}
          </button>
        </form>
        {error && (
          <p className="admin-message admin-error" role="alert">
            {error}
          </p>
        )}
        {status && (
          <p className="admin-message admin-success" role="status">
            {status}
          </p>
        )}
        <section className="admin-users" aria-labelledby="firestore-users-title">
          <div className="admin-users-heading">
            <h2 id="firestore-users-title">Users in Database</h2>
            <div className="admin-users-actions">
              <button
                className="admin-refresh"
                type="button"
                onClick={refreshFirestoreUsers}
                disabled={isLoadingUsers || isDeletingUsers || isUploading}
              >
                {isLoadingUsers ? 'Loading…' : 'Refresh'}
              </button>
              <button
                className="admin-refresh"
                type="button"
                onClick={handleDownloadCsv}
                disabled={
                  firestoreUsers.length === 0 ||
                  isLoadingUsers ||
                  isDeletingUsers ||
                  isUploading
                }
              >
                Download CSV
              </button>
              <button
                className="admin-delete"
                type="button"
                onClick={handleDeleteAllUsers}
                disabled={
                  firestoreUsers.length === 0 ||
                  isLoadingUsers ||
                  isDeletingUsers ||
                  isUploading
                }
              >
                {isDeletingUsers ? 'Deleting users…' : 'Delete all users'}
              </button>
            </div>
          </div>
          {firestoreError && (
            <p className="admin-message admin-error" role="alert">
              {firestoreError}
            </p>
          )}
          {!firestoreError && !isLoadingUsers && firestoreUsers.length === 0 && (
            <p className="admin-file-summary">No user documents found in Firestore.</p>
          )}
          {firestoreUsers.length > 0 && (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <caption>Firestore users collection ({firestoreUsers.length} records)</caption>
                <thead>
                  <tr>
                    <th scope="col">Staff No</th>
                    <th scope="col">Name</th>
                    <th scope="col">Mobile Number</th>
                    <th scope="col">Table Number</th>
                    <th scope="col">TnG</th>
                    <th scope="col">Redeem Code</th>
                    <th scope="col">Eligible</th>
                    <th scope="col">Checked In</th>
                  </tr>
                </thead>
                <tbody>
                  {firestoreUsers.map((user) => (
                    <tr key={user.id}>
                      <td>{displayField(user.staffNo ?? user.no)}</td>
                      <td>{displayField(user.name)}</td>
                      <td>{displayField(user.mobileNumber ?? user.phoneNumber)}</td>
                      <td>{displayField(user.tableNumber)}</td>
                      <td>{displayField(user.tng)}</td>
                      <td>{displayField(user.redeemCode ?? user.prize)}</td>
                      <td>{displayField(user.eligible)}</td>
                      <td>{displayField(user.checkedIn)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}

export default Admin
