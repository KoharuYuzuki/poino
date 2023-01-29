const fs = require('fs').promises

const args = process.argv

if (args.length < 5) {
  console.log('引数が不足しています')
  return
}

const inputPath  = args[2]
const outputPath = args[3]
const fileType   = args[4]

fs.readFile(inputPath)
.then((data) => {
  const base64 = data.toString('base64')
  const dataurl = `data:image/${fileType};base64,${base64}`
  return fs.writeFile(outputPath, dataurl, {encoding: 'utf-8'})
})
.catch(console.error)
