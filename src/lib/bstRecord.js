// Generació del registre de donacions en JSON per integrar-lo als sistemes del BST.
//
// Format pensat per ser estable i fàcil de mapejar:
//  - claus en snake_case i en anglès, valors codificats (enums), dates ISO 8601
//  - versió d'esquema explícita (schema_version) per poder evolucionar-lo
//  - camps opcionals a null en lloc d'ometre'ls, perquè l'estructura sigui fixa
// L'esquema complet és a docs/bst-donation-record.schema.json

import { DONOR, CENTERS, DONATION_TYPES } from '../data.js'

export const SCHEMA_ID = 'https://bst.cat/schemas/donation-record/1.0.json'
export const SCHEMA_VERSION = '1.0.0'

const pointByCode = (code) => CENTERS.find((p) => p.code === code)
const typeById = (id) => DONATION_TYPES.find((t) => t.id === id)

function donorBlock() {
  const [abo, rh] = [DONOR.bloodGroup.replace(/[+-]/, ''), DONOR.bloodGroup.endsWith('-') ? 'negative' : 'positive']
  return {
    donor_id: DONOR.id,
    full_name: DONOR.fullName,
    birth_date: DONOR.birthDate,
    blood_group: { abo: abo === '0' ? 'O' : abo, rh },
    contact: {
      email: DONOR.email,
      phone_e164: DONOR.phone.replace(/\s/g, ''),
    },
    address: { municipality: DONOR.municipality, district: DONOR.district, postal_code: DONOR.postalCode },
    reference_center_code: DONOR.referenceCenter.code,
  }
}

function centerBlock(code) {
  const p = pointByCode(code)
  return p
    ? { center_code: p.code, name: p.name, kind: p.kind, address: p.address, zone: p.zone }
    : { center_code: code, name: null, kind: null, address: null, zone: null }
}

function envelope(recordType, payload) {
  return {
    $schema: SCHEMA_ID,
    schema_version: SCHEMA_VERSION,
    record_type: recordType,
    generated_at: new Date().toISOString(),
    source: { system: 'BST App', app_version: '2.4.1', channel: 'mobile_app' },
    ...payload,
  }
}

/** Registre d'una cita reservada (status: scheduled). */
export function appointmentRecord({ appointmentId, typeId, pointCode, start, contact }) {
  const t = typeById(typeId)
  return envelope('appointment', {
    donor: { ...donorBlock(), full_name: contact.name, contact: { email: contact.email, phone_e164: contact.phone.replace(/\s/g, '') } },
    appointment: {
      appointment_id: appointmentId,
      status: 'scheduled',
      donation_type: typeId,
      scheduled_start: start.toISOString(),
      estimated_duration_min: t.minutes,
      center: centerBlock(pointCode),
      reminders: { sms: true, email: true },
      check_in: { method: 'qr', donor_qr_payload: `BST:${DONOR.id}` },
    },
  })
}

/** Historial complet de donacions completades del donant. */
export function donationHistoryRecord(donations) {
  const totals = donations.reduce((acc, d) => {
    acc.count += 1
    acc.volume_ml += d.volume || 0
    acc.by_type[d.type] = (acc.by_type[d.type] || 0) + 1
    return acc
  }, { count: 0, volume_ml: 0, by_type: {} })

  return envelope('donation_history', {
    donor: donorBlock(),
    summary: { total_donations: totals.count, total_volume_ml: totals.volume_ml, by_type: totals.by_type },
    donations: donations.map((d) => ({
      donation_id: d.id,
      status: d.status || 'completed',
      donation_type: d.type,
      performed_at: d.date,
      volume_ml: d.volume,
      center: centerBlock(d.center),
      appointment_id: d.appointmentId || null,
      // Identificador ISBT 128 de la unitat: l'assigna el BST en l'extracció
      isbt128_donation_id: null,
    })),
  })
}

export const toPrettyJson = (obj) => JSON.stringify(obj, null, 2)

export function downloadJson(obj, filename) {
  const blob = new Blob([toPrettyJson(obj)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export async function copyJson(obj) {
  try {
    await navigator.clipboard.writeText(toPrettyJson(obj))
    return true
  } catch {
    return false
  }
}
