import { getApp, getApps, initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: 'AIzaSyBAqzXS1BQPOMB4keUGlEA-yeCneKlHbt0',
  authDomain: 'alliance-convention.firebaseapp.com',
  projectId: 'alliance-convention',
  storageBucket: 'alliance-convention.firebasestorage.app',
  messagingSenderId: '339867765361',
  appId: '1:339867765361:web:f3eb3f72134cde1de3a9d0',
}

export function getFirestoreDb() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig)
  return getFirestore(app)
}
