// Regression test cases for validation
import { VIIBE_CONFIG, type Step2Input } from './config.ts';
import { applyInputPrecedence } from './precedence.ts';
import { validateTagCoverage } from './tagEnforcement.ts';
import { isEntityAvailable, markEntityUsed, startNewBatch } from './popCulture.ts';

export interface RegressionTestResult {
  testName: string;
  passed: boolean;
  details: string;
  expectedValue?: any;
  actualValue?: any;
}

export function runRegressionTests(): RegressionTestResult[] {
  const results: RegressionTestResult[] = [];

  // Test 1: Sentimental + Explicit → auto-remaps to PG-13
  try {
    const input = { tone: "Sentimental", rating: "Explicit", category: "test", subcategory: "test" };
    const processed = applyInputPrecedence(input);
    
    results.push({
      testName: "Sentimental + Explicit → PG-13 remap",
      passed: processed.rating === "PG-13",
      details: `Input: Sentimental + Explicit, Output: ${processed.tone} + ${processed.rating}`,
      expectedValue: "PG-13",
      actualValue: processed.rating
    });
  } catch (error) {
    results.push({
      testName: "Sentimental + Explicit → PG-13 remap",
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 2: Romantic + R → auto-remaps to PG  
  try {
    const input = { tone: "Romantic", rating: "R", category: "test", subcategory: "test" };
    const processed = applyInputPrecedence(input);
    
    results.push({
      testName: "Romantic + R → PG remap",
      passed: processed.rating === "PG",
      details: `Input: Romantic + R, Output: ${processed.tone} + ${processed.rating}`,
      expectedValue: "PG",
      actualValue: processed.rating
    });
  } catch (error) {
    results.push({
      testName: "Romantic + R → PG remap",
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 3: Tag coverage validation
  try {
    const lines = [
      { lane: "option1", text: "Jesse loves baseball games" },
      { lane: "option2", text: "Jesse hits home runs perfectly" },
      { lane: "option3", text: "Jesse swings at baseball" },
      { lane: "option4", text: "Baseball is fun for everyone" }
    ];
    const tags = ['"Jesse"', 'baseball'];
    const validation = validateTagCoverage(lines, tags);
    
    const expectedHits = 3; // Jesse appears in 3 lines
    results.push({
      testName: "Tag coverage: Jesse + baseball",
      passed: validation.hardTagHits >= expectedHits,
      details: `Expected ≥${expectedHits} hits, got ${validation.hardTagHits}`,
      expectedValue: `≥${expectedHits}`,
      actualValue: validation.hardTagHits
    });
  } catch (error) {
    results.push({
      testName: "Tag coverage: Jesse + baseball",
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 4: Pop-culture entity cooldown
  try {
    startNewBatch();
    
    const entity = "napster";
    const firstCheck = isEntityAvailable(entity);
    markEntityUsed(entity);
    const secondCheck = isEntityAvailable(entity);
    
    results.push({
      testName: "Pop-culture entity cooldown",
      passed: firstCheck === true && secondCheck === false,
      details: `First check: ${firstCheck}, Second check: ${secondCheck}`,
      expectedValue: "true, false",
      actualValue: `${firstCheck}, ${secondCheck}`
    });
  } catch (error) {
    results.push({
      testName: "Pop-culture entity cooldown",
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  // Test 5: Configuration validation
  try {
    const textOptions = VIIBE_CONFIG.system.optionsPerStep.text;
    const visualOptions = VIIBE_CONFIG.system.optionsPerStep.visual;
    
    results.push({
      testName: "Option count locked to 4",
      passed: textOptions === 4 && visualOptions === 4,
      details: `Text: ${textOptions}, Visual: ${visualOptions}`,
      expectedValue: "4, 4",
      actualValue: `${textOptions}, ${visualOptions}`
    });
  } catch (error) {
    results.push({
      testName: "Option count locked to 4",
      passed: false,
      details: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    });
  }

  return results;
}

export function logRegressionResults(results: RegressionTestResult[]): void {
  const passedCount = results.filter(r => r.passed).length;
  const totalCount = results.length;
  
  console.log(`\n🧪 Regression Tests: ${passedCount}/${totalCount} passed`);
  
  results.forEach(result => {
    const icon = result.passed ? '✅' : '❌';
    console.log(`${icon} ${result.testName}: ${result.details}`);
    
    if (!result.passed && result.expectedValue && result.actualValue) {
      console.log(`   Expected: ${result.expectedValue}, Got: ${result.actualValue}`);
    }
  });
  
  console.log('');
}