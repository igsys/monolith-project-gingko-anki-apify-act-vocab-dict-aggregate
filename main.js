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
    gingko: Maybe {
        row00: String
        row01: String
        row02: String
        row03: String
        row04: String
        row05: String
        row06: String
        row07: String
        row08: String
        row09: String
        row10: String
        row11: String
        row12: String
        row13: String
        row14: String
        row15: String
        row16: String
        row17: String
        row18: String
        row19: String
        images: String
        videos: String
        audios: String
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

const LEVEL_TYPE = {
    NOVOICE: 'NOVOICE',
    INTERMEDIATE: 'INTERMEDIATE',
    EXPERT: 'EXPERT'
}

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
                console.log(item.examples[0])
                example = {
                    mono: item.examples[0].mono || '',
                    tran: item.examples[0].tran || '',
                    level: item.examples[0].level || '',
                }
            }
        }
    })
    return example
}

const encodeFilename = (str, id, gender = '', extension = 'mp3') => {
    if (str) {
        const result = Base64.encode(gender.slice(0, 1) + str)
        // console.log(result)
        return `${id}_${result.replace(/=/g, '').slice(0, 19)}.${extension}`
    }
    return ''
}

const upperCaseFirstLetter = (str) => {
    if (str) return str.charAt(0).toUpperCase() + str.toLowerCase().slice(1)
    return ''
}

const flattenExamples = (cambridgePicked, lingueeDefs, id, input) => {
    let flattened = []
    let tts = []
    cambridgePicked.forEach((item, i) => {
        const example_intermd = getIntermediateExample(item.meaning, lingueeDefs)
        // console.log(item.examples)
        const example_novoice_mono = item.examples[0].mono
        const example_novoice_tran = item.examples[0].tran
        // NOTE: use cambridge second example if intermediate example does not exist
        const example_intermd_mono = example_intermd.mono ?
            example_intermd.mono :
            item.examples[1] ? item.examples[1].mono : ''
        const example_intermd_tran = example_intermd.mono ?
            example_intermd.tran :
            item.examples[1] ? item.examples[1].tran : ''
        const example_intermd_level = example_intermd.level ?
            example_intermd.level :
            item.examples[1] ? item.examples[1].level : ''

        let entry = {}
        entry = {
            grammar: item.grammar,
            form: item.form,
            meaning: item.meaning,
            meaning_mono: item.meaning_mono,
            gender: item.examples[0].gender,
            level: item.examples[0].level,
            example_mono: example_novoice_mono,
            example_tran: example_novoice_tran,
        }
        if (example_novoice_mono) flattened.push(entry)

        entry = {
            grammar: item.grammar,
            form: item.form,
            meaning: item.meaning,
            meaning_mono: item.meaning_mono,
            gender: item.examples[0].gender,
            level: example_intermd_level,
            example_mono: example_intermd_mono,
            example_tran: example_intermd_tran,
        }
        if (example_intermd_mono) flattened.push(entry)

        // NOTE: return only tts containing text
        let ttsItem = {}

        // Keyword query
        ttsItem = {
            language: input.cambridge.input.source,
            gender: item.examples[0].gender,
            text: input.cambridge.input.query,
            filename: encodeFilename(input.cambridge.input.query, id, item.examples[0].gender)
        }
        if (ttsItem.text) tts.push(ttsItem)

        // NOVOICE mono
        ttsItem = {
            language: input.cambridge.input.source,
            gender: item.examples[0].gender,
            text: example_novoice_mono,
            filename: encodeFilename(example_novoice_mono, id, item.examples[0].gender)
        }
        if (ttsItem.text) tts.push(ttsItem)

        // NOVOICE translation
        ttsItem = {
            language: input.cambridge.input.translation,
            gender: item.examples[0].gender,
            text: example_novoice_tran,
            filename: encodeFilename(example_novoice_tran, id, item.examples[0].gender)
        }
        if (ttsItem.text) tts.push(ttsItem)

        // INTERMEDIATE mono
        ttsItem = {
            language: input.cambridge.input.source,
            gender: item.examples[0].gender,
            text: example_intermd_mono,
            filename: encodeFilename(example_intermd_mono, id, item.examples[0].gender)
        }
        if (ttsItem.text) tts.push(ttsItem)

        // INTERMEDIATE translation
        ttsItem = {
            language: input.cambridge.input.translation,
            gender: item.examples[0].gender,
            text: example_intermd_tran,
            filename: encodeFilename(example_intermd_tran, id, item.examples[0].gender)
        }
        if (ttsItem.text) tts.push(ttsItem)

        // Meaning_mono
        ttsItem = {
            language: input.cambridge.input.source,
            gender: item.examples[0].gender,
            text: item.meaning_mono,
            filename: encodeFilename(item.meaning_mono, id, item.examples[0].gender)
        }
        if (ttsItem.text) tts.push(ttsItem)

    })
    // console.log('flattened', flattened)
    return {
        flattened,
        tts
    }
}

const getLanguageImageTag = (language) => {
    return `<img src='_${language}.png' />`
}

const getCambridgeDictLinkTag = (source, translation, query) => {
    const uri = `https://dictionary.cambridge.org/dictionary/${source}-${translation}/${query}`
    return `<a href='${uri}'>Cambridge</a>`
}

const getLingueeDictLinkTag = (source, translation, query) => {
    const uri = `https://www.linguee.com/${translation}-${source}/search?source=${source}&query=${query}`
    return `<a href='${uri}'>Linguee</a>`
}

const getConjugationLinkTag = (source, translation, query) => {
    const uri = `https://conjugator.reverso.net/conjugation-${source}-verb-${query}.html`
    return `<a href='${uri}>Conjugation</a>`
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
    const { flattened, tts } = flattenExamples(picked, input.linguee.definitions, input.id, input)

    // Output a single word definition with simple examples: Basic::Vocab
    const vocabs = []
    flattened.forEach((item, i) => {
        console.log(item)
        const query = input.cambridge.input.query || input.linguee.input.query
        const source = input.cambridge.input.source || input.linguee.input.source
        const translation = input.cambridge.input.translation || input.linguee.input.translation
        const id = input.id
        const def_simple = input.cambridge.meta.def_simple
        const {
            example_mono,
            example_tran,
            meaning,
            meaning_mono,
            grammar,
            gender,
            form,
            level
        } = item

        vocabs.push({
            row00: query,
            row01: def_simple || '',
            row02: input.cambridge.meta.ipa || '',
            row03: example_mono,
            row04: example_tran,
            row05: meaning,
            row06: meaning_mono,
            row07: grammar,
            row08: gender,
            row09: form,
            row10: upperCaseFirstLetter(level),
            row11: '',
            row12: '',
            row13: '',
            row14: '',
            row15: '',
            row16: getCambridgeDictLinkTag(source, translation, query),
            row17: getLingueeDictLinkTag(source, translation, query),
            row18: getConjugationLinkTag(source, translation, query),
            row19: getLanguageImageTag(source),
            // NOTE: calculate a filename.mp3
            audio00: `[sound:${encodeFilename(query, id, gender)}]`,
            audio01: `[sound:${encodeFilename(def_simple, id, gender)}]`,
            audio02: '',
            audio03: `[sound:${encodeFilename(example_mono, id, gender)}]`,
            audio04: `[sound:${encodeFilename(example_tran, id, gender)}]`,
            audio05: `[sound:${encodeFilename(meaning, id, gender)}]`,
            audio06: `[sound:${encodeFilename(meaning_mono, id, gender)}]`,
            audio07: '',
            audio08: '',
            audio09: '',
            audio10: '',
            audio11: '',
            audio12: '',
            audio13: '',
            audio14: '',
            audio15: '',
            audio16: '',
            audio17: '',
            audio18: '',
            audio19: '',
            flag_novoice: level === LEVEL_TYPE.NOVOICE ? 'y' : '',
            flag_intermd: level === LEVEL_TYPE.INTERMEDIATE ? 'y' : '',
            flag_expert: level === LEVEL_TYPE.EXPERT ? 'y' : '',
            lang: source,
            tag: [
                '#sdy.vocab', `#lng.${source}`, `#lvl.${level.toLowerCase()}`
            ]
        })
    })

    // Output to each example phrases: Cloze::Phrase
    const phrases = []


    // Store the output
    const output = {
        createdAt: new Date(),
        name: 'apify/igsys/vocab-dict-aggregate',
        data: {
            // 'external_id': '',
            // header_date: '',
            // images: '',
            // videos: ''
            vocabs,
            tts,
            phrases,
            // row00: input.cambridge.input.query || input.linguee.input.query,
            // row01: '',
            // row02: '',
            // row03: '',
            // row04: '',
            // row05: '',
            // row06: '',
            // row07: '',
            // row08: '',
            // row09: '',
            // row10: '',
            // row11: '',
            // row12: '',
            // row13: '',
            // row14: '',
            // row15: '',
            // row16: '',
            // row17: '',
            // row18: '',
            // row19: '',
            // audio00: '',  // NOTE: calculate a filename.mp3
            // audio01: '',
            // audio02: '',
            // audio03: '',
            // audio04: '',
            // audio05: '',
            // audio06: '',
            // lang: input.linguee.input.source,
        }
    }

    await Apify.setValue('OUTPUT', output)
})
