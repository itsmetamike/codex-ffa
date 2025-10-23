#!/usr/bin/env node

/**
 * Validation script to check if deep research is actually running
 * 
 * Usage:
 *   node validate-research.js <responseId>
 * 
 * Example:
 *   node validate-research.js resp_083889b7ef7c9e9f0068f6e0f3fa3c8196ab98959207990966
 */

const https = require('https');

const responseId = process.argv[2];

if (!responseId) {
  console.error('❌ Error: Response ID required');
  console.log('\nUsage:');
  console.log('  node validate-research.js <responseId>');
  console.log('\nExample:');
  console.log('  node validate-research.js resp_083889b7ef7c9e9f0068f6e0f3fa3c8196ab98959207990966');
  console.log('\nGet your response ID from:');
  console.log('  - Server logs: [Deep Research] Response created: { id: "resp_..." }');
  console.log('  - Database: DeepResearchJob table, responseId column');
  process.exit(1);
}

const apiKey = process.env.OPENAI_API_KEY;

if (!apiKey) {
  console.error('❌ Error: OPENAI_API_KEY environment variable not set');
  console.log('\nSet it with:');
  console.log('  export OPENAI_API_KEY=sk-proj-...');
  console.log('\nOr on Windows:');
  console.log('  set OPENAI_API_KEY=sk-proj-...');
  process.exit(1);
}

console.log('🔍 Validating deep research...\n');
console.log(`Response ID: ${responseId}`);
console.log(`API Key: ${apiKey.substring(0, 20)}...`);
console.log('\n⏳ Checking with OpenAI API...\n');

const options = {
  hostname: 'api.openai.com',
  path: `/v1/responses/${responseId}`,
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json'
  }
};

const req = https.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);

      if (res.statusCode === 200) {
        console.log('✅ SUCCESS! Deep research is REAL and running!\n');
        console.log('📊 Response Details:');
        console.log('─────────────────────────────────────────');
        console.log(`ID:      ${response.id}`);
        console.log(`Status:  ${response.status}`);
        console.log(`Model:   ${response.model}`);
        console.log(`Created: ${new Date(response.created_at * 1000).toLocaleString()}`);
        
        if (response.output && response.output.length > 0) {
          console.log(`\n📝 Output Items: ${response.output.length}`);
          
          const toolCalls = response.output.filter(item => 
            item.type === 'web_search_call' || 
            item.type === 'code_interpreter_call' ||
            item.type === 'file_search_call'
          );
          
          if (toolCalls.length > 0) {
            console.log(`🔧 Tool Calls: ${toolCalls.length}`);
            console.log('\nRecent tool activity:');
            toolCalls.slice(-5).forEach((call, idx) => {
              if (call.type === 'web_search_call' && call.action) {
                console.log(`  ${idx + 1}. Web search: ${call.action.type} - ${call.action.query || call.action.url || 'N/A'}`);
              } else {
                console.log(`  ${idx + 1}. ${call.type}`);
              }
            });
          }
        }

        console.log('\n🎯 Status Meaning:');
        console.log('─────────────────────────────────────────');
        if (response.status === 'queued') {
          console.log('⏳ QUEUED: Job accepted, waiting to start');
          console.log('   Expected: Will change to "in_progress" within 30 seconds');
        } else if (response.status === 'in_progress') {
          console.log('🔄 IN PROGRESS: Research actively running!');
          console.log('   Expected: Will complete in 10-30 minutes');
        } else if (response.status === 'completed') {
          console.log('✅ COMPLETED: Research finished!');
          console.log('   Check your UI for the full report');
        } else if (response.status === 'failed') {
          console.log('❌ FAILED: Research encountered an error');
          if (response.error) {
            console.log(`   Error: ${response.error.message}`);
          }
        }

        console.log('\n💰 Cost Estimate:');
        console.log('─────────────────────────────────────────');
        console.log('Deep research typically costs $10-$100+ depending on:');
        console.log('  - Number of web searches (20-100+)');
        console.log('  - Code interpreter runs (5-20+)');
        console.log('  - Output length (2k-10k+ tokens)');
        console.log('\nCheck your OpenAI dashboard for actual cost:');
        console.log('https://platform.openai.com/usage');

        console.log('\n✨ Validation Complete!\n');
        
      } else {
        console.error(`❌ Error: HTTP ${res.statusCode}`);
        console.error('\nResponse:', JSON.stringify(response, null, 2));
        
        if (res.statusCode === 404) {
          console.log('\n💡 This could mean:');
          console.log('  1. Response ID is incorrect');
          console.log('  2. Response expired (30 days)');
          console.log('  3. Response belongs to different API key');
        } else if (res.statusCode === 401) {
          console.log('\n💡 Authentication failed:');
          console.log('  - Check your OPENAI_API_KEY is correct');
          console.log('  - Ensure API key has not expired');
        }
      }
    } catch (error) {
      console.error('❌ Error parsing response:', error.message);
      console.error('\nRaw response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error('❌ Request failed:', error.message);
  console.log('\n💡 Possible issues:');
  console.log('  - No internet connection');
  console.log('  - OpenAI API is down');
  console.log('  - Firewall blocking request');
});

req.end();
