import fs from 'node:fs'
import process from 'node:process'
import yaml from 'yaml'
const { parseDocument } = yaml

const file = new URL('../openapi.yaml', import.meta.url)
const serverFile = new URL('../src/server.ts', import.meta.url)
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

const serverSource = fs.readFileSync(serverFile, 'utf8')
const activeOperations = new Set()
const routePattern = /router\.(get|post|patch|put|delete)\s*\(\s*['"]([^'"]+)['"]/g
for (const [, method, routePath] of serverSource.matchAll(routePattern)) {
  const openApiPath = routePath.replace(/:([A-Za-z0-9_]+)/g, '{$1}')
  activeOperations.add(`${method.toLowerCase()} ${openApiPath}`)
}

const documentedOperations = new Set()
for (const [routePath, pathItem] of Object.entries(contract.paths ?? {})) {
  for (const method of ['get', 'post', 'put', 'patch', 'delete']) {
    if (pathItem?.[method]) documentedOperations.add(`${method} ${routePath}`)
  }
}

const undocumented = [...activeOperations].filter((operation) => !documentedOperations.has(operation))
const stale = [...documentedOperations].filter((operation) => !activeOperations.has(operation))
if (undocumented.length || stale.length) {
  if (undocumented.length) console.error(`Rutas activas sin documentar: ${undocumented.join(', ')}`)
  if (stale.length) console.error(`Operaciones documentadas sin ruta activa: ${stale.join(', ')}`)
  process.exit(1)
}

console.log(`OpenAPI válido: ${contract.info.title}`)
console.log(`Versión: ${contract.openapi} · Rutas: ${pathNames.length} · Operaciones sincronizadas: ${activeOperations.size} · Esquemas: ${schemaNames.length}`)
