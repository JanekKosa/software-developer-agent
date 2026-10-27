// Spike: how Node's process.env on this Windows machine matches variable names (read-only except for its own
// process's environment, which ends with it).
const show = name => JSON.stringify(process.env[name] === undefined ? '<unset>' : process.env[name].length > 0 ? 'set' : '<empty>')

for (const name of ['USERPROFILE', 'userprofile', 'UserProfile', 'temp', 'Tmp', 'localappdata', 'AppData',
  'USERPROFıLE', 'UſERPROFILE', 'uſerprofile', 'USERPROFİLE', 'TEMP\u0000', ' TEMP', 'TEMP ']) {
  console.log(JSON.stringify(name), show(name))
}

process.env.S7_SPIKE_EMPTY = ''
console.log('set to empty ->', show('S7_SPIKE_EMPTY'), 'in keys:', Object.keys(process.env).includes('S7_SPIKE_EMPTY'))
process.env.s7_spike_case = 'x'
console.log('set lower, read upper ->', show('S7_SPIKE_CASE'), 'key as listed:', Object.keys(process.env).filter(k => /s7_spike_case/i.test(k)))
delete process.env.S7_SPIKE_CASE
console.log('delete upper, read lower ->', show('s7_spike_case'))
