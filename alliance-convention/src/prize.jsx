import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import tngLogo from './assets/TnGLogo.png'
import { getFirestoreDb } from './firebase.js'
import { getFirestoreUserByDocumentId } from './firestoreUsers.js'

function normalizeTngType(value) {
  return String(value ?? '').replace(/[^a-z\d]/gi, '').toUpperCase()
}

function Prize() {
  const [searchParams] = useSearchParams()
  const tngType =
    [...searchParams.entries()]
      .find(([key]) => key.toLowerCase() === 'tng')?.[1]
      ?.trim() || 'RM10'
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
      const user = await getFirestoreUserByDocumentId(getFirestoreDb(), submittedPhone)
      setLookupResult(
        user && normalizeTngType(user.tng) === normalizeTngType(tngType) ? user : false,
      )
    } catch (error) {
      console.error('Could not look up prize in Firestore:', error)
      setLookupError('Unable to load prize details. Please try again.')
    } finally {
      setIsLookingUp(false)
    }
  }

  return (
    <main className="cover">
      {lookupResult === null && (
        <section
          className="table-lookup tng-lookup"
          aria-labelledby="prize-lookup-title"
        >
          <img className="tng-logo" src={tngLogo} alt="Touch 'n Go" />
          <h1 id="prize-lookup-title">Feeling lucky? Your {tngType} TnG prize awaits!</h1>
          <form className="lookup-form" onSubmit={handleSubmit}>
            <label htmlFor="prize-phone-number">Phone number</label>
            <input
              id="prize-phone-number"
              type="tel"
              autoComplete="tel"
              placeholder="Enter phone number"
              value={phoneNumber}
              onChange={(event) => setPhoneNumber(event.target.value)}
              required
            />
            <button type="submit" disabled={isLookingUp}>
              {isLookingUp ? 'Searching…' : `Let's GO!`}
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
        <div className="result-overlay" onClick={() => setLookupResult(null)}>
          <div
            className={`table-result${lookupResult ? ' tng-prize-result' : ' tng-fail-result'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="prize-result-title"
            onClick={(event) => event.stopPropagation()}
          >
            {lookupResult ? (
              <>
                <img className="tng-logo" src={tngLogo} alt="Touch 'n Go" />
                <span className="result-label">Congratulations!</span>
                <p className="guest-name">{lookupResult.name}</p>
                <h2 id="prize-result-title" className="table-number">
                  You've won {lookupResult.tng} TnG
                </h2>
                <p className="prize-number-label">Your voucher redemption code</p>
                <p className="prize-number">
                  {lookupResult.redeemCode ?? lookupResult.prize}
                </p>
              </>
            ) : (
              <>
                <img className="tng-logo" src={tngLogo} alt="Touch 'n Go" />
                <span className="result-label">The prize is playing hide-and-seek!</span>
                <h2 id="prize-result-title">
                  No {tngType} TnG prize this time.
                  Keep smiling and try again!
                </h2>
              </>
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

export default Prize
