// Network connectivity helper for debugging Edge Function issues
export async function testNetworkConnectivity(): Promise<{
  supabaseReachable: boolean;
  edgeFunctionReachable: boolean;
  error?: string;
}> {
  try {
    // Test basic Supabase connectivity
    const supabaseTest = await fetch('https://qdigssobxfgoeuvkejpo.supabase.co/rest/v1/', {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    
    const supabaseReachable = supabaseTest.ok;
    
    // Test Edge Function endpoint specifically
    const edgeFunctionTest = await fetch('https://qdigssobxfgoeuvkejpo.supabase.co/functions/v1/openai-health', {
      method: 'OPTIONS',
      signal: AbortSignal.timeout(5000)
    });
    
    const edgeFunctionReachable = edgeFunctionTest.ok;
    
    return {
      supabaseReachable,
      edgeFunctionReachable
    };
    
  } catch (error) {
    return {
      supabaseReachable: false,
      edgeFunctionReachable: false,
      error: error instanceof Error ? error.message : 'Unknown network error'
    };
  }
}