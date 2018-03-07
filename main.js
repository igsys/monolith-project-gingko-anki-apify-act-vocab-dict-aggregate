const Apify = require('apify')
const typeCheck = require('type-check').typeCheck

// Definition of the input
const INPUT_TYPE = `{
    crawledAt: String,
    name: String,
    input: {
        dictionary: String,
        source: String
        query: String
    },
    definitions: [
        {
            meaning: String,
            grammar: String,
            examples: [
                {
                    level: Maybe String,
                    mono: Maybe String,
                    tran: Maybe String
                }
            ]
        }
    ]
}`

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
    console.log(`Input name: ${input.name}`)

    // Store the output
    const output = {
        createdAt: new Date(),
        name: 'apify/igsys/vocab-dict-aggregate',
        data: {
            // 'external_id': '',
            // header_date: '',
            // images: '',
            // videos: ''
            row00: input.query,
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
            // audio00: '',
            // audio01: '',
            // audio02: '',
            // audio03: '',
            // audio04: '',
            // audio05: '',
            // audio06: '',
            lang: input.source,
        }
    }

    await Apify.setValue('OUTPUT', output)
})
