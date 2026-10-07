/**
 * Utilitário padrão Banco Central do Brasil para payload EMV estático do Pix (copia e cola).
 * Gera a string no formato TLV (Tag-Length-Value) com checksum CRC16 (polinômio 0x1021).
 */

function formatField(id: string, value: string): string {
  const len = value.length.toString().padStart(2, '0')
  return `${id}${len}${value}`
}

function crc16(data: string): string {
  let crc = 0xffff
  for (let i = 0; i < data.length; i++) {
    crc ^= data.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff
      } else {
        crc = (crc << 1) & 0xffff
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export interface PixPayloadParams {
  key: string
  merchantName: string
  merchantCity: string
  amount?: number
  txid?: string
}

export function generatePixPayload({
  key,
  merchantName,
  merchantCity,
  amount,
  txid = '***',
}: PixPayloadParams): string {
  const cleanKey = key.trim()
  const cleanName = merchantName.trim().slice(0, 25) || "LOYOLA'S LANCHES"
  const cleanCity = merchantCity.trim().slice(0, 15) || 'PINDAMONHANGABA'

  // Tag 26: Merchant Account Information - GUI + Chave
  const gui = formatField('00', 'br.gov.bcb.pix')
  const keyField = formatField('01', cleanKey)
  const merchantAccountInfo = formatField('26', `${gui}${keyField}`)

  // Tag 00: Payload Format Indicator
  const formatIndicator = formatField('00', '01')

  // Tag 52: Merchant Category Code
  const merchantCategoryCode = formatField('52', '0000')

  // Tag 53: Transaction Currency (986 = BRL)
  const transactionCurrency = formatField('53', '986')

  // Tag 54: Transaction Amount (opcional em estático, mas muito útil)
  let transactionAmount = ''
  if (amount && amount > 0) {
    transactionAmount = formatField('54', amount.toFixed(2))
  }

  // Tag 58: Country Code
  const countryCode = formatField('58', 'BR')

  // Tag 59: Merchant Name
  const nameField = formatField('59', cleanName)

  // Tag 60: Merchant City
  const cityField = formatField('60', cleanCity)

  // Tag 62: Additional Data Field Template (TxID)
  const txidField = formatField('05', txid || '***')
  const additionalDataField = formatField('62', txidField)

  const payloadWithoutCRC = `${formatIndicator}${merchantAccountInfo}${merchantCategoryCode}${transactionCurrency}${transactionAmount}${countryCode}${nameField}${cityField}${additionalDataField}6304`
  const checksum = crc16(payloadWithoutCRC)

  return `${payloadWithoutCRC}${checksum}`
}
