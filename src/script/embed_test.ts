import { EMBEDDING_DIMENSION, EMBEDDING_MODEL } from '../config'
import { embedTexts } from '../modules/embedding'

const cosineSimilarity = (a: number[], b: number[]): number => {
    let dot = 0
    let normA = 0
    let normB = 0
    for (let i = 0; i < a.length; i++) {
        dot += a[i] * b[i]
        normA += a[i] * a[i]
        normB += b[i] * b[i]
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    if (denominator === 0) throw new Error('Zero vector cannot compute cosine similarity')
    return dot / denominator
}

export const runEmbeddingTest = async () => {
    const texts = [
        '我喜欢吃西瓜。',
    ]

    const texts1 = [
        '我喜欢吃水果。',
    ]

    if (!EMBEDDING_MODEL) {
        throw new Error('Missing embedding config: EMBEDDING_MODEL')
    }

    const vectors = await embedTexts(texts, EMBEDDING_MODEL, EMBEDDING_DIMENSION, 'float', 'query')
    const vectors1 = await embedTexts(texts1, EMBEDDING_MODEL, EMBEDDING_DIMENSION, 'float', 'document')


    texts.forEach((text, i) => {
        console.log(`text[${i}]------------: ${text}`)
    })

    texts1.forEach((text, i) => {
        console.log(`text1[${i}]------------: ${text}`)
    })

    const cosine = cosineSimilarity(vectors[0], vectors1[0])
    console.log(`cosine(text[0], text[1])-----------: ${cosine}`)

}

if (require.main === module) {
    void runEmbeddingTest().catch((e) => {
        console.error('embed_test failed:', e)
        process.exit(1)
    })
}
