import { lazy, Suspense, useState } from 'react'
import { Route, Routes } from 'react-router-dom'
import { collection, getDocs } from 'firebase/firestore'
import Prize from './prize.jsx'
import { getFirestoreDb } from './firebase.js'
import { normalizePhoneNumber } from './userCsv.js'

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
    const normalizedPhone = normalizePhoneNumber(submittedPhone)

    setSearchedPhone(submittedPhone)
    setLookupResult(null)
    setLookupError('')
    setIsLookingUp(true)

    try {
      const snapshot = await getDocs(collection(getFirestoreDb(), 'users'))
      const user = snapshot.docs
        .map((userDocument) => userDocument.data())
        .find(
          (record) =>
            normalizePhoneNumber(record.mobileNumber ?? record.phoneNumber ?? '') ===
            normalizedPhone,
        )
      setLookupResult(user ?? false)
    } catch (error) {
      console.error('Could not look up guest in Firestore:', error)
      setLookupError('Unable to load guest details. Please try again.')
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
                <h2 className="guest-name table-welcome">
                  Welcome to Alliance Bank
                  <br />
                  Sales Convention Gala Dinner 2026.
                </h2>
                <p className="table-number-label">Your table number</p>
                <h2 id="result-title" className="table-number table-welcome">
                  {lookupResult.tableNumber}
                </h2>
              </>
            ) : (
              <h2 id="result-title">User not found, please try again.</h2>
            )}
            <br/><br/>
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
