export function parseUsersCsv(csv) {
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
    headers.map((header, index) => [
      header.replace(/^\uFEFF/, '').trim().toLowerCase(),
      index,
    ]),
  )
  const staffNoIndex = headerIndexes['staff no'] ?? headerIndexes.no
  const nameIndex = headerIndexes.name
  const phoneIndex = headerIndexes['mobile number']
  const tableIndex = headerIndexes['table number']
  const tngIndex = headerIndexes.tng
  const redeemCodeIndex = headerIndexes['redeem code'] ?? headerIndexes.prize
  const eligibleIndex = headerIndexes.eligible
  const checkedInIndex = headerIndexes['checked in']

  if (nameIndex === undefined || phoneIndex === undefined || tableIndex === undefined) {
    throw new Error('The user CSV must contain Name, Mobile Number, and Table Number columns.')
  }

  return records.map((record) => ({
    staffNo: staffNoIndex === undefined ? '' : record[staffNoIndex] ?? '',
    name: record[nameIndex] ?? '',
    mobileNumber: record[phoneIndex] ?? '',
    tableNumber: record[tableIndex] ?? '',
    tng: tngIndex === undefined ? '' : record[tngIndex] ?? '',
    redeemCode: redeemCodeIndex === undefined ? '' : record[redeemCodeIndex] ?? '',
    eligible: eligibleIndex === undefined ? '' : record[eligibleIndex] ?? '',
    checkedIn: checkedInIndex === undefined ? '' : record[checkedInIndex] ?? '',
  }))
}

export function normalizePhoneNumber(phoneNumber) {
  const digits = phoneNumber.replace(/\D/g, '')
  return digits.startsWith('60') ? `0${digits.slice(2)}` : digits
}
