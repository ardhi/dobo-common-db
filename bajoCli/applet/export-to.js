import _path from 'path'

const batch = 100

function makeProgress (spin) {
  const { secToHms } = this.app.bajo
  return async function ({ batchNo, data, batchStart, batchEnd } = {}) {
    if (data.length === 0) return
    spin.setText('Batch #%d (%s)', batchNo, secToHms(batchEnd.toTime() - batchStart.toTime(), true))
  }
}

async function exportTo (...args) {
  const { importPkg } = this.app.bajo
  const { dayjs } = this.app.bajo.lib
  const { isEmpty, map } = this.app.bajo.lib._
  const { getInfo, start } = this.app.dobo

  const [input, select] = await importPkg('bajoCli:@inquirer/input',
    'bajoCli:@inquirer/select')
  const schemas = map(this.app.dobo.schemas, 'name')
  if (isEmpty(schemas)) return this.print.fatal('No schema found!')
  let [model, dest, query] = args
  if (isEmpty(model)) {
    model = await select({
      message: this.print.write('Please choose model:'),
      choices: map(schemas, s => ({ value: s }))
    })
  }
  if (isEmpty(dest)) {
    dest = await input({
      message: this.print.write('Please enter destination file:'),
      default: `${model}-${dayjs().format('YYYYMMDD')}.ndjson`,
      validate: (item) => !isEmpty(item)
    })
  }
  if (isEmpty(query)) {
    query = await input({
      message: this.print.write('Please enter a query (if any):')
    })
  }
  const spin = this.print.spinner().start('Exporting...')
  const progressFn = makeProgress.call(this, spin)
  const { connection } = getInfo(model)
  await start(connection.name)
  try {
    const filter = { query }
    const result = await this.exportTo(model, dest, { filter, batch, progressFn })
    spin.succeed('%d records successfully exported to \'%s\'', result.count, _path.resolve(result.file))
  } catch (err) {
    console.log(err)
    spin.fatal('Error: %s', err.message)
  }
}

export default exportTo
