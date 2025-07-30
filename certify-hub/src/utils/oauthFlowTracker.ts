// OAuth Flow Tracker - Detailed step-by-step debugging

export const trackOAuthFlow = () => {
  console.group('🔍 OAUTH FLOW TRACKER - Step by Step Analysis');
  
  // Step 1: Current environment
  console.log('📍 STEP 1: Current Environment');
  console.table({
    'Current URL': window.location.href,
    'Origin': window.location.origin,
    'Protocol': window.location.protocol,
    'Hostname': window.location.hostname,
    'Port': window.location.port,
    'NODE_ENV': process.env.NODE_ENV
  });
  
  // Step 2: Environment variables
  console.log('📍 STEP 2: Environment Variables');
  console.table({
    'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
    'Has Google Client ID': !!process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    'Google Client ID': process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    'Google Redirect URL': process.env.NEXT_PUBLIC_GOOGLE_REDIRECT_URL,
    'App Environment': process.env.NEXT_PUBLIC_APP_ENV
  });
  
  // Step 3: Calculated callback URL
  const calculatedCallback = `${window.location.origin}/auth/callback`;
  console.log('📍 STEP 3: Calculated Callback URL');
  console.log('Callback URL that will be sent to Google:', calculatedCallback);
  
  // Step 4: Check for hardcoded URLs in localStorage or sessionStorage  
  console.log('📍 STEP 4: Storage Check for Hardcoded URLs');
  try {
    const localStorageItems = Object.keys(localStorage).map(key => ({
      key,
      value: localStorage.getItem(key),
      containsLocalhost: localStorage.getItem(key)?.includes('localhost')
    })).filter(item => item.containsLocalhost);
    
    const sessionStorageItems = Object.keys(sessionStorage).map(key => ({
      key,
      value: sessionStorage.getItem(key),
      containsLocalhost: sessionStorage.getItem(key)?.includes('localhost')
    })).filter(item => item.containsLocalhost);
    
    if (localStorageItems.length + sessionStorageItems.length > 0) {
      console.warn('⚠️ Found localhost URLs in storage:');
      console.table([...localStorageItems, ...sessionStorageItems]);
    } else {
      console.log('✅ No localhost URLs found in storage');
    }
  } catch (e) {
    console.log('Could not check storage:', e);
  }
  
  console.groupEnd();
  
  return {
    currentOrigin: window.location.origin,
    calculatedCallback,
    environment: process.env.NODE_ENV,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
  };
};

export const interceptOAuthRequest = () => {
  // Monitor network requests to see what's actually being sent
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    const [url, options] = args;
    
    // Check if this is an OAuth-related request
    if (typeof url === 'string' && (url.includes('oauth') || url.includes('google'))) {
      console.group('🌐 OAUTH NETWORK REQUEST INTERCEPTED');
      console.log('URL:', url);
      console.log('Options:', options);
      
      // Try to parse and log the redirect_uri if present
      try {
        const urlObj = new URL(url);
        const redirectUri = urlObj.searchParams.get('redirect_uri');
        if (redirectUri) {
          console.log('🎯 FOUND REDIRECT_URI:', redirectUri);
          if (redirectUri.includes('localhost')) {
            console.error('❌ PROBLEM: redirect_uri contains localhost!');
          } else {
            console.log('✅ redirect_uri looks correct');
          }
        }
      } catch (e) {
        console.log('Could not parse URL parameters');
      }
      
      console.groupEnd();
    }
    
    return originalFetch(...args);
  };
  
  console.log('🔗 OAuth request interceptor installed');
};

export const analyzeSupabaseAuthURL = async () => {
  console.group('🔍 SUPABASE AUTH URL ANALYSIS');
  
  try {
    // This is what Supabase internally constructs
    const authUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/authorize`;
    console.log('Supabase Auth Base URL:', authUrl);
    
    // Check if Supabase has any stored redirect URLs
    const authKeys = Object.keys(localStorage).filter(key => 
      key.includes('supabase') || key.includes('auth')
    );
    
    console.log('Supabase/Auth related localStorage keys:');
    authKeys.forEach(key => {
      const value = localStorage.getItem(key);
      console.log(`${key}:`, value);
      if (value?.includes('localhost')) {
        console.error(`❌ FOUND LOCALHOST IN ${key}:`, value);
      }
    });
    
  } catch (error) {
    console.error('Error analyzing Supabase auth URL:', error);
  }
  
  console.groupEnd();
};