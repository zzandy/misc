const fs = require('fs');
const path = require('path')
const { createHash } = require('crypto');
const { channel } = require('diagnostics_channel');


const [node, file, base, changed] = process.argv;

if (base === undefined || changed === undefined) {
    console.error('missing required arguments')
    console.error('usage:')
    console.error(`    ${node} ${file} <base-folder> <changed-folder>`)
    process.exit(1)
}

if (!fs.existsSync(base) || !fs.lstatSync(base).isDirectory()) {
    console.error('directory does not exist: ' + base);
    process.exit(1)
}

if (!fs.existsSync(changed) || !fs.lstatSync(changed).isDirectory()) {
    console.error('directory does not exist: ' + changed);
    process.exit(1)
}


if (path.resolve(base) == path.resolve(changed)) {
    console.error('base and changed folders must be different')
    process.exit(1);
}

const files = new Map();

run();

async function run() {
    for (const file of fs.readdirSync(base, { recursive: true, withFileTypes: true })) {
        if (file.isFile())

            add(await read(file.parentPath + '\\' + file.name), file.parentPath + '\\' + file.name)
    }

    for (const file of fs.readdirSync(changed, { recursive: true, withFileTypes: true })) {
        if (file.isFile())

            add(await read(file.parentPath + '\\' + file.name), null, file.parentPath + '\\' + file.name)
    }


    for (const [_, { base, changed }] of files) {

        if (base.length == 0) console.log('added ' + changed.join('\n    '));
        else if (changed.length == 0) console.log('deleted ' + base.join('\n    '))

    }

}

function add(hash, source, target) {

    const x = files.get(hash) || { base: [], changed: [] };


    if (!files.has(hash)) files.set(hash,);

    if (source)
        x.base.push(source);
    if (target)
        x.changed.push(target);

    files.set(hash, x);
}

function read(filename) {
    const hash = createHash('sha512');
    return new Promise((resolve) => {
        const input = fs.createReadStream(filename);
        input.on('readable', () => {
            // Only one element is going to be produced by the
            // hash stream.
            const data = input.read();
            if (data)
                hash.update(data);
            else {
                resolve(hash.digest('hex'));
            }
        })
    })
}