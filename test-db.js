const initSqlJs = require('sql.js')
const path = require('path')
const fs = require('fs')

async function test() {
  console.log('开始测试 sql.js...')
  
  const SQL = await initSqlJs()
  console.log('sql.js 加载成功')
  
  const db = new SQL.Database()
  console.log('数据库创建成功')
  
  db.run('CREATE TABLE test (id INTEGER PRIMARY KEY, name TEXT)')
  db.run('INSERT INTO test (name) VALUES (?)', ['hello'])
  
  const stmt = db.prepare('SELECT * FROM test')
  while (stmt.step()) {
    const row = stmt.getAsObject()
    console.log('查询结果:', row)
  }
  stmt.free()
  
  console.log('测试成功！')
}

test().catch(console.error)
