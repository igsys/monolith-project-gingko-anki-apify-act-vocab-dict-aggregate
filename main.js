const Apify = require('apify')
const typeCheck = require('type-check').typeCheck
const Base64 = require('js-base64').Base64

// Definition of the input
const PHRASE_TYPE = `{
    crawledAt: String
    name: String
    input: {
        translation: String
        source: String
        query: String
    }
    meta: Maybe {
        ipa: Maybe String
        def_simple: Maybe String
    }
    definitions: [
        {
            meaning: String
            meaning_mono: Maybe String
            grammar: String
            form: Maybe String
            examples: [
                {
                    gender: Maybe String
                    level: String
                    mono: String
                    tran: String
                }
            ]
        }
    ]
}`

const INPUT_TYPE = `{
    id: String
    linguee: ${PHRASE_TYPE}
    cambridge: ${PHRASE_TYPE}
}`

const getNounGender = noun => {

}

// NOTE: pick out definitions from cambridge dictionary.  First entry when grammar and form changed.
const pickDefinition = (cambridgeDefs) => {
    let picked = []
    let grammar_tmp = ''
    let form_tmp = ''
    cambridgeDefs.forEach((item, i) => {
        if (item.grammar !== grammar_tmp || item.form !== form_tmp) {
            picked.push(item)
            grammar_tmp = item.grammar
            form_tmp = item.form
        }
    })
    // console.log(picked)
    return picked
}

// NOTE: matches meaning from linguee Definitions array, and extract intermediate examples
const getIntermediateExample = (meaning, lingueeDefs) => {
    const meaning_replaced = meaning.replace('to ', '').trim()
    let example = {
        mono: '',
        tran: ''
    }
    lingueeDefs.forEach(item => {
        // console.log(item.meaning.includes(meaning_replaced))
        if (item.meaning.includes(meaning_replaced)) {
            if (item.examples[0]) {
                console.log(item.examples[0].mono)
                example = {
                    mono: item.examples[0].mono || '',
                    tran: item.examples[0].tran || ''
                }
            }
        }
    })
    return example
}

const encodeFilename = (str) => {
    if (str) {
        const result = Base64.encode(str)
        console.log(result)
        return result.replace('=', '').slice(0, 19)
    }
    return ''
}

const flattenExamples = (cambridgePicked, lingueeDefs) => {
    let flattened = []
    cambridgePicked.forEach((item, i) => {
        const example_intermd = getIntermediateExample(item.meaning, lingueeDefs)
        // console.log(item.examples)
        // NOTE: use cambridge second example if intermediate example does not exist
        const example_novoice_mono = item.examples[0].mono
        const example_novoice_tran = item.examples[0].tran
        const example_intermd_mono = example_intermd.mono ?
            example_intermd.mono :
            item.examples[1] ? item.examples[1].mono : ''
        const example_intermd_tran = example_intermd.mono ?
            example_intermd.tran :
            item.examples[1] ? item.examples[1].tran : ''

        flattened.push({
            grammar: item.grammar,
            form: item.form,
            meaning: item.meaning,
            meaning_mono: item.meaning_mono,
            gender: item.examples[0].gender,
            example_novoice_mono,
            example_novoice_mono_fn: encodeFilename(example_novoice_mono),
            example_novoice_tran,
            example_novoice_tran_fn: encodeFilename(example_novoice_tran),
            example_intermd_mono,
            example_intermd_mono_fn: encodeFilename(example_intermd_mono),
            example_intermd_tran,
            example_intermd_tran_fn: encodeFilename(example_intermd_tran),
        })
    })
    console.log('flattened', flattened)
    return flattened
}

const getCambridgeDictLink = (source, translation, query) => {
    const uri = `https://dictionary.cambridge.org/dictionary/${source}-${translation}/${query}`
    return `<a href='${uri}'>Cambridge</a>`
}

const getLingueeDictLink = (source, translation, query) => {
    const uri = `https://www.linguee.com/${translation}-${source}/search?source=${source}&query=${query}`
    return `<a href='${uri}'>Linguee</a>`
}

Apify.main(async () => {
    // Fetch the input and check it has a valid format
    // You don't need to check the input, but it's a good practice.
    const input = await Apify.getValue('INPUT')
    if (!typeCheck(INPUT_TYPE, input)) {
        console.log('Expected input:')
        console.log(INPUT_TYPE)
        console.log('Received input:')
        console.dir(input)
        throw new Error('Received invalid input')
    }

    // Here's the place for your magic...
    console.log(`Input name: ${input.linguee.name}`)
    console.log(`Input id: ${input.id}`)

    // Pick Definition
    const picked = pickDefinition(input.cambridge.definitions)
    const flattened = flattenExamples(picked, input.linguee.definitions)

    // Output a single word definition with simple examples: Basic::Vocab


    // Output to each example phrases: Cloze::Phrase


    // Store the output
    const output = {
        createdAt: new Date(),
        name: 'apify/igsys/vocab-dict-aggregate',
        data: {
            // 'external_id': '',
            // header_date: '',
            // images: '',
            // videos: ''
            row00: input.cambridge.input.query || input.linguee.input.query,
            row01: '',
            row02: '',
            row03: '',
            row04: '',
            row05: '',
            row06: '',
            row07: '',
            row08: '',
            row09: '',
            row10: '',
            row11: '',
            row12: '',
            row13: '',
            row14: '',
            row15: '',
            row16: '',
            row17: '',
            row18: '',
            row19: '',
            audio00: '',  // NOTE: calculate a filename.mp3
            audio01: '',
            audio02: '',
            audio03: '',
            audio04: '',
            audio05: '',
            audio06: '',
            lang: input.linguee.input.source,
        }
    }

    await Apify.setValue('OUTPUT', output)
})
