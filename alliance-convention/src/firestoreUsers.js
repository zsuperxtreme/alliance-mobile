import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore'
import { formatMobileNumber, normalizePhoneNumber } from './userCsv.js'

export async function getFirestoreUserByDocumentId(db, documentId) {
  const formattedDocumentId = formatMobileNumber(documentId)
  if (!formattedDocumentId) return null

  const userDocument = await getDoc(doc(db, 'users', formattedDocumentId))
  if (!userDocument.exists()) return null

  return { ...userDocument.data(), id: userDocument.id }
}

function getPhoneNumberCandidates(phoneNumber) {
  const trimmedPhoneNumber = phoneNumber.trim()
  const digits = trimmedPhoneNumber.replace(/\D/g, '')
  const normalizedPhoneNumber = normalizePhoneNumber(trimmedPhoneNumber)
  const stringCandidates = [
    trimmedPhoneNumber,
    digits,
    normalizedPhoneNumber,
    normalizedPhoneNumber.length > 3
      ? `${normalizedPhoneNumber.slice(0, 3)}-${normalizedPhoneNumber.slice(3)}`
      : '',
    normalizedPhoneNumber.startsWith('0')
      ? `60${normalizedPhoneNumber.slice(1)}`
      : normalizedPhoneNumber,
  ]

  if (normalizedPhoneNumber.startsWith('0')) {
    stringCandidates.push(`+60${normalizedPhoneNumber.slice(1)}`)
  }

  const numberCandidates = stringCandidates
    .filter((candidate) => /^\d+$/.test(candidate))
    .map(Number)
    .filter(Number.isSafeInteger)

  return [...new Set([...stringCandidates, ...numberCandidates].filter(Boolean))]
}

export async function findFirestoreUsersByPhoneNumber(db, phoneNumber) {
  const phoneNumberCandidates = getPhoneNumberCandidates(phoneNumber)
  if (!phoneNumberCandidates.length) return []

  const exactPhoneNumber = phoneNumber.trim()
  if (!exactPhoneNumber.includes('/')) {
    const exactMatch = await getDoc(doc(db, 'users', exactPhoneNumber))
    if (exactMatch.exists()) {
      return [{ ...exactMatch.data(), id: exactMatch.id }]
    }
  }

  const usersCollection = collection(db, 'users')
  const snapshot = await getDocs(
    query(usersCollection, where('mobileNumber', 'in', phoneNumberCandidates)),
  )

  return snapshot.docs.map((userDocument) => ({
    ...userDocument.data(),
    id: userDocument.id,
  }))
}
