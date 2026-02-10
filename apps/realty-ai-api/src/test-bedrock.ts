import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({
    region: 'us-east-1',
    credentials: {
        accessKeyId: process.env.AI_AWS_BEDROCK_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AI_AWS_BEDROCK_SECRET_ACCESS_KEY!,
    },
});

console.log('Testing with:', {
    accessKeyId: process.env.AI_AWS_BEDROCK_ACCESS_KEY_ID?.substring(0, 8) + '...',
    secretKeyLength: process.env.AI_AWS_BEDROCK_SECRET_ACCESS_KEY?.length,
});

async function test() {
    try {
        const response = await client.send(
            new InvokeModelCommand({
                modelId: 'amazon.titan-embed-text-v2:0',
                body: JSON.stringify({ inputText: 'test' }),
            })
        );
        console.log('Success! Got embedding of length:', JSON.parse(new TextDecoder().decode(response.body)).embedding.length);
    } catch (e: any) {
        console.error('Error:', e.message);
    }
}

test();
