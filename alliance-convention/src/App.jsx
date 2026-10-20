import { lazy, Suspense, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { doc, updateDoc } from 'firebase/firestore'
import Prize from './prize.jsx'
import { getFirestoreDb } from './firebase.js'
import { getFirestoreUserByDocumentId } from './firestoreUsers.js'

const Admin = lazy(() => import('./admin.jsx'))

function Home() {
  const [phoneNumber, setPhoneNumber] = useState('')
  const [searchedPhone, setSearchedPhone] = useState('')
  const [lookupResult, setLookupResult] = useState(null)
  const [lookupError, setLookupError] = useState('')
  const [isLookingUp, setIsLookingUp] = useState(false)

  async function handleSubmit(event) {
    event.preventDefault()
    const submittedPhone = phoneNumber.trim()

    setSearchedPhone(submittedPhone)
    setLookupResult(null)
    setLookupError('')
    setIsLookingUp(true)

    try {
      const db = getFirestoreDb()
      const user = await getFirestoreUserByDocumentId(db, submittedPhone)
      if (user) {
        await updateDoc(doc(db, 'users', user.id), { checkedIn: 'YES' })
      }
      setLookupResult(user ?? false)
    } catch (error) {
      console.error('Could not look up or check in guest in Firestore:', error)
      setLookupError('Unable to load or update guest details. Please try again.')
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <main className="cover">
      {lookupResult === null && (
        <section className="table-lookup" aria-labelledby="lookup-title">
          <h1 id="lookup-title">Guest Check-In</h1>
          <p>Enter your phone number to check in and view your table detail.</p>
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
                <h2 className="guest-name table-welcome">
                  Welcome to Alliance Bank
                  <br />
                  GBTB & GCIB Gala Dinner
                </h2>
                <p className="table-number-label">Your table number</p>
                <h2 id="result-title" className="table-number table-welcome">
                  {lookupResult.tableNumber}
                </h2>
              </>
            ) : (
              <h2 id="result-title">We couldn’t find your details just yet. Please check your number and try again.</h2>
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
      <Route path="/prize" element={<Prize />} />
      <Route
        path="/admin"
        element={
          <Suspense fallback={<p>Loading admin…</p>}>
            <Admin />
          </Suspense>
        }
      />
    </Routes>
  )
}

export default App
