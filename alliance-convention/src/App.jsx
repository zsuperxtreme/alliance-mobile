import { useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import Tng1 from './Tng1.jsx'
import Tng2 from './Tng2.jsx'
import Tng3 from './Tng3.jsx'
import Tng4 from './Tng4.jsx'

function parseCsv(csv) {
  const rows = []
  let row = []
  let field = ''
  let insideQuotes = false

  for (let index = 0; index < csv.length; index += 1) {
    const character = csv[index]

    if (character === '"') {
      if (insideQuotes && csv[index + 1] === '"') {
        field += '"'
        index += 1
      } else {
        insideQuotes = !insideQuotes
      }
    } else if (character === ',' && !insideQuotes) {
      row.push(field.trim())
      field = ''
    } else if ((character === '\n' || character === '\r') && !insideQuotes) {
      row.push(field.trim())
      if (row.some((value) => value)) rows.push(row)
      row = []
      field = ''
      if (character === '\r' && csv[index + 1] === '\n') index += 1
    } else {
      field += character
    }
  }

  row.push(field.trim())
  if (row.some((value) => value)) rows.push(row)

  const [headers, ...records] = rows
  if (!headers) {
    throw new Error('The user CSV is empty or missing its header row.')
  }

  const headerIndexes = Object.fromEntries(
    headers.map((header, index) => [header.replace(/^\uFEFF/, '').toLowerCase(), index]),
  )
  const nameIndex = headerIndexes.name
  const phoneIndex = headerIndexes['mobile number']
  const tableIndex = headerIndexes['table number']

  if (nameIndex === undefined || phoneIndex === undefined || tableIndex === undefined) {
    throw new Error('The user CSV must contain Name, Mobile Number, and Table Number columns.')
  }

  return records.map((record) => ({
    name: record[nameIndex] ?? '',
    phoneNumber: record[phoneIndex] ?? '',
    tableNumber: record[tableIndex] ?? '',
  }))
}

function normalizePhoneNumber(phoneNumber) {
  const digits = phoneNumber.replace(/\D/g, '')
  return digits.startsWith('60') ? `0${digits.slice(2)}` : digits
}

function Home() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [searchedPhone, setSearchedPhone] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const submittedPhone = phoneNumber.trim()
    const normalizedPhone = normalizePhoneNumber(submittedPhone)

    setSearchedPhone(submittedPhone)
    setLookupResult(null)
    setLookupError('')
    setIsLookingUp(true)

    try {
      const response = await fetch('/user.csv', { cache: 'no-store' })
      if (!response.ok) {
        throw new Error(`Failed to load guest list (${response.status}).`)
      }

      const users = parseCsv(await response.text())
      const user = users.find(
        (record) => normalizePhoneNumber(record.phoneNumber) === normalizedPhone,
      )
      setLookupResult(user ?? false)
    } catch (error) {
      console.error('Could not look up guest:', error)
      setLookupError('Unable to load the guest list. Please try again.')
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <main className="cover">
      {lookupResult === null && (
        <section className="table-lookup" aria-labelledby="lookup-title">
          <h1 id="lookup-title">Find Your Table</h1>
          <p>Enter your phone number to view your table details.</p>
          <form className="lookup-form" onSubmit={handleSubmit}>
            <label htmlFor="phone-number">Phone number</label>
            <input
              id="phone-number"
              type="tel"
              autoComplete="tel"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
            />
            <button type="submit" disabled={isLookingUp}>
              {isLookingUp ? 'Searching…' : 'Submit'}
            </button>
          </form>
          {lookupError && (
            <p className="lookup-error" role="alert">
              {lookupError}
            </p>
          )}
        </section>
      )}
      {searchedPhone && lookupResult !== null && (
        <div
          className="result-overlay"
          onClick={() => setLookupResult(null)}
        >
          <div
            className={`table-result${lookupResult ? '' : ' not-found'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
            onClick={(event) => event.stopPropagation()}
          >
            {lookupResult ? (
              <>
                <span className="result-label">Guest found</span>
                <p className="guest-name">{lookupResult.name}</p>
                <h2 id="result-title" className="table-number">
                  Table {lookupResult.tableNumber}
                </h2>
              </>
            ) : (
              <h2 id="result-title">User not found, please try again.</h2>
            )}
            <button
              className="result-close"
              type="button"
              onClick={() => setLookupResult(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/tng1" element={<Tng1 />} />
      <Route path="/tng2" element={<Tng2 />} />
      <Route path="/tng3" element={<Tng3 />} />
      <Route path="/tng4" element={<Tng4 />} />
    </Routes>
  )
}

export default App
