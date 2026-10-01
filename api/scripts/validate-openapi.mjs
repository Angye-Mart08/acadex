import fs from 'node:fs'
import process from 'node:process'
import yaml from 'yaml'
const { parseDocument } = yaml

const file = new URL('../openapi.yaml', import.meta.url)
const source = fs.readFileSync(file, 'utf8')
const document = parseDocument(source)

if (document.errors.length > 0) {
  for (const error of document.errors) console.error(error.message)
  process.exit(1)
}

const contract = document.toJSON()
const requiredKeys = ['openapi', 'info', 'servers', 'paths', 'components']
const missing = requiredKeys.filter((key) => !(key in contract))

if (missing.length > 0) {
  console.error(`Faltan propiedades requeridas: ${missing.join(', ')}`)
  process.exit(1)
}

if (contract.openapi !== '3.1.0') {
  console.error(`Se esperaba OpenAPI 3.1.0 y se encontró ${contract.openapi}`)
  process.exit(1)
}

const pathNames = Object.keys(contract.paths ?? {})
const schemaNames = Object.keys(contract.components?.schemas ?? {})
if (pathNames.length === 0 || schemaNames.length === 0) {
  console.error('El contrato debe declarar al menos una ruta y un esquema.')
  process.exit(1)
}

console.log(`OpenAPI válido: ${contract.info.title}`)
console.log(`Versión: ${contract.openapi} · Rutas: ${pathNames.length} · Esquemas: ${schemaNames.length}`)
