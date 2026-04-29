import { AgentMode } from '@hashgraph/hedera-agent-kit';
import {
    HederaLangchainToolkit,
    ResponseParserService,
} from '@hashgraph/hedera-agent-kit-langchain';
import { Client, PrivateKey } from '@hiero-ledger/sdk';
import { StructuredToolInterface } from '@langchain/core/tools';
import { createAgent } from 'langchain';
import { MemorySaver } from '@langchain/langgraph';
import { ChatOpenAI } from '@langchain/openai';
import prompts from 'prompts';
import * as dotenv from 'dotenv';
import { saucerSwapPlugin } from '../';

dotenv.config();

function validateEnv() {
    const required = ['ACCOUNT_ID', 'PRIVATE_KEY', 'OPENAI_API_KEY'];
    const missing = required.filter(key => !process.env[key]);
    if (missing.length > 0) {
        console.error(`Missing required environment variables: ${missing.join(', ')}`);
        console.error('Copy .env.example to .env and fill in your keys.');
        process.exit(1);
    }
}

async function bootstrap(): Promise<void> {
    validateEnv();

    // Hedera client setup (Mainnet with timeout configuration)
    const client = Client.forMainnet()
        .setOperator(
            process.env.ACCOUNT_ID!,
            PrivateKey.fromStringECDSA(process.env.PRIVATE_KEY!),
        )
        .setRequestTimeout(60000) // 1 minute
        .setMaxAttempts(10) // Reduce max attempts further
        .setMaxBackoff(5000); // 5 seconds max backoff

    // Prepare Hedera toolkit
    const hederaAgentToolkit = new HederaLangchainToolkit({
        client,
        configuration: {
            tools: [],
            plugins: [saucerSwapPlugin],
            context: {
                mode: AgentMode.AUTONOMOUS,
            },
        },
    });

    // Fetch tools from a toolkit
    const tools: StructuredToolInterface[] = hederaAgentToolkit.getTools();

    const llm = new ChatOpenAI({
        model: 'gpt-4o-mini',
    });

    const agent = createAgent({
        model: llm,
        tools: tools,
        systemPrompt:
            'You are a helpful assistant with access to Hedera blockchain tools and the SaucerSwap V2 plugin tools.',
        checkpointer: new MemorySaver(),
    });

    const responseParsingService = new ResponseParserService(hederaAgentToolkit.getTools());

    console.log('Hedera Agent CLI Chatbot (SaucerSwap V2) — type "exit" to quit');
    console.log('Available SaucerSwap V2 plugin tools:');
    console.log('- get_swap_quote_v2_tool: Quote a swap between two tokens');
    console.log('- swap_v2_tool: Execute a token swap on SaucerSwap V2');
    console.log('');

    while (true) {
        const { userInput } = await prompts({
            type: 'text',
            name: 'userInput',
            message: 'You',
        });

        // Handle early termination
        if (!userInput || ['exit', 'quit'].includes(userInput.trim().toLowerCase())) {
            console.log('Goodbye!');
            break;
        }

        try {
            const response = await agent.invoke(
                { messages: [{ role: 'user', content: userInput }] },
                { configurable: { thread_id: '1' } },
            );

            console.log('--- Agent Response ---');

            const parsedToolData = responseParsingService.parseNewToolMessages(response);

            const toolCall = parsedToolData[0];

            if (!toolCall) {
                // No tool was called — simple chat response
                console.log(
                    `AI: ${response.messages[response.messages.length - 1].content ?? JSON.stringify(response)}`,
                );
            } else {
                // Tool call (query or transaction) — print agent text plus tool data
                console.log(
                    `\nAI: ${response.messages[response.messages.length - 1].content ?? JSON.stringify(response)}`,
                );
                console.log('\n--- Tool Data ---');
                console.log('Direct tool response:', toolCall.parsedData.humanMessage);
                console.log('Full tool response object:', JSON.stringify(toolCall.parsedData, null, 2));
            }
        } catch (err) {
            console.error('Error:', err);
        }
    }
}

bootstrap()
    .catch(err => {
        console.error('Fatal error during CLI bootstrap:', err);
        process.exit(1);
    })
    .then(() => {
        process.exit(0);
    });
