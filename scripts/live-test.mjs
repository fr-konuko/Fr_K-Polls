// scripts/live-test.mjs
// Automated End-to-End Live Integration Test Suite for JOPA Research Africa

const BASE_URL = process.env.TEST_URL || "http://localhost:3000";

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n=======================================================");
  console.log(`🚀 Starting JOPA Research Africa Live Test Suite against: ${BASE_URL}`);
  console.log("=======================================================\n");

  // -------------------------------------------------------------
  // Test 1: Public Homepage
  // -------------------------------------------------------------
  console.log("TEST SUITE 1: Public Homepage (/)");
  try {
    const res = await fetch(`${BASE_URL}/`);
    assert(res.status === 200, `Homepage returns HTTP 200 (Got: ${res.status})`);
    
    // Check security headers
    assert(res.headers.get("x-frame-options") === "DENY", "Security Header X-Frame-Options: DENY present");
    assert(res.headers.get("x-content-type-options") === "nosniff", "Security Header X-Content-Type-Options: nosniff present");

    const html = await res.text();
    assert(html.includes("JOPA Research Africa"), "Contains brand title 'JOPA Research Africa'");
    assert(html.includes("Measure opinions."), "Contains hero tagline 'Measure opinions.'");
    assert(html.includes("Services"), "Contains Services navigation link");
    assert(html.includes("Results"), "Contains Results navigation link");
    assert(html.includes("Vote now"), "Contains 'Vote now' call-to-action button");

    // CRITICAL REQUIREMENT: NO ADMIN LINK IN PUBLIC UI
    const hasAdminInNav = /<nav[^>]*>[\s\S]*?(href=["']\/(?:admin|portal)["']|Admin)[\s\S]*?<\/nav>/i.test(html);
    assert(!hasAdminInNav, "Public Navbar strictly OMITTED any Admin or Portal links");

    const hasAdminInFooter = /<footer[^>]*>[\s\S]*?(href=["']\/(?:admin|portal)["']|Admin\s*Portal)[\s\S]*?<\/footer>/i.test(html);
    assert(!hasAdminInFooter, "Public Footer strictly OMITTED any Admin links");
  } catch (err) {
    assert(false, `Homepage failed to load: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 2: Public Voting Page (/vote)
  // -------------------------------------------------------------
  console.log("\nTEST SUITE 2: Public Voting Page (/vote)");
  try {
    const res = await fetch(`${BASE_URL}/vote`);
    assert(res.status === 200, `Voting page returns HTTP 200 (Got: ${res.status})`);
    const html = await res.text();
    assert(html.includes("Live Voting Portal"), "Contains page header 'Live Voting Portal'");
    assert(html.includes("Select Active Election"), "Contains poll selection toolbar");
    
    const hasAdminLink = /href=["']\/(?:admin|portal)["']/i.test(html);
    assert(!hasAdminLink, "Voting page contains NO administrative links");
  } catch (err) {
    assert(false, `Voting page failed to load: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 3: Public Live Results Dashboard (/results)
  // -------------------------------------------------------------
  console.log("\nTEST SUITE 3: Public Results Dashboard (/results)");
  try {
    const res = await fetch(`${BASE_URL}/results`);
    assert(res.status === 200, `Results page returns HTTP 200 (Got: ${res.status})`);
    const html = await res.text();
    assert(html.includes("Verified Results Dashboard"), "Contains 'Verified Results Dashboard' header");
    assert(html.includes("Total Verified Votes"), "Contains 'Total Verified Votes' KPI card");
    assert(html.includes("Official Returns Table"), "Contains 'Official Returns Table'");

    const hasAdminLink = /href=["']\/(?:admin|portal)["']/i.test(html);
    assert(!hasAdminLink, "Results page contains NO administrative links");
  } catch (err) {
    assert(false, `Results page failed to load: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 4: Public Contact Form (/contact) & Honeypot Anti-Spam
  // -------------------------------------------------------------
  console.log("\nTEST SUITE 4: Public Contact Form (/contact)");
  try {
    const res = await fetch(`${BASE_URL}/contact`);
    assert(res.status === 200, `Contact page returns HTTP 200 (Got: ${res.status})`);
    const html = await res.text();
    assert(html.includes("Contact JOPA Research Africa"), "Contains contact page title");
    assert(html.includes('name="hp_field"'), "Honeypot anti-spam input 'hp_field' is present");
    assert(html.includes('style="display:none"') || html.includes('style="display: none"'), "Honeypot is visually hidden from human users");
  } catch (err) {
    assert(false, `Contact page failed to load: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 5: Static Assets Verification
  // -------------------------------------------------------------
  console.log("\nTEST SUITE 5: Static Assets Verification");
  try {
    const favRes = await fetch(`${BASE_URL}/assets/favicon.svg`);
    assert(favRes.status === 200, `Favicon /assets/favicon.svg loads HTTP 200 (Got: ${favRes.status})`);

    const placeholderRes = await fetch(`${BASE_URL}/assets/placeholder.svg`);
    assert(placeholderRes.status === 200, `Placeholder avatar /assets/placeholder.svg loads HTTP 200 (Got: ${placeholderRes.status})`);

    const gridRes = await fetch(`${BASE_URL}/assets/data-grid.svg`);
    assert(gridRes.status === 200, `Hero graphic /assets/data-grid.svg loads HTTP 200 (Got: ${gridRes.status})`);
  } catch (err) {
    assert(false, `Static assets failed to load: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 6: Isolated Admin Protection & Middleware Redirect
  // -------------------------------------------------------------
  console.log("\nTEST SUITE 6: Edge Middleware Protection (/portal)");
  try {
    // Attempt unauthenticated GET to /portal with redirect: 'manual'
    const unauthRes = await fetch(`${BASE_URL}/portal`, { redirect: "manual" });
    const isRedirect = unauthRes.status === 307 || unauthRes.status === 302 || unauthRes.status === 308;
    assert(isRedirect, `Unauthenticated request to /portal redirects (Status: ${unauthRes.status})`);
    
    const location = unauthRes.headers.get("location") || "";
    assert(location.includes("/portal/login"), `Redirect destination is /portal/login (Got: ${location})`);

    // Verify /portal/login renders sign-in form
    const loginPageRes = await fetch(`${BASE_URL}/portal/login`);
    assert(loginPageRes.status === 200, `Portal login page returns HTTP 200 (Got: ${loginPageRes.status})`);
    const loginHtml = await loginPageRes.text();
    assert(loginHtml.includes("Portal Sign-In"), "Login page contains 'Portal Sign-In'");
    assert(loginHtml.includes("Administrator Passcode"), "Login page contains passcode prompt");
  } catch (err) {
    assert(false, `Middleware redirect test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 7: Admin Authentication API (/api/portal/login)
  // -------------------------------------------------------------
  console.log("\nTEST SUITE 7: Admin Authentication API & Session Issuance");
  let authCookie = "";
  try {
    // 7a: Empty passcode rejection
    const emptyRes = await fetch(`${BASE_URL}/api/portal/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: "" }),
    });
    assert(emptyRes.status === 401, `Empty passcode rejected with 401 Unauthorized (Got: ${emptyRes.status})`);

    // 7b: Wrong passcode rejection
    const wrongRes = await fetch(`${BASE_URL}/api/portal/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: "WrongPassword123!" }),
    });
    assert(wrongRes.status === 401, `Invalid passcode rejected with 401 Unauthorized (Got: ${wrongRes.status})`);

    // 7c: Correct passcode acceptance
    const validRes = await fetch(`${BASE_URL}/api/portal/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ passcode: "Frank" }),
    });
    assert(validRes.status === 200, `Valid passcode accepted with 200 OK (Got: ${validRes.status})`);

    const validData = await validRes.json();
    assert(validData.success === true, "Response payload contains { success: true }");

    // Extract Set-Cookie header
    const setCookie = validRes.headers.get("set-cookie") || "";
    assert(setCookie.includes("jopa_admin_auth="), "Issues HTTP cookie 'jopa_admin_auth'");
    assert(setCookie.includes("HttpOnly") || setCookie.includes("httponly"), "Cookie has HttpOnly security flag");
    assert(setCookie.includes("SameSite=lax") || setCookie.includes("samesite=lax"), "Cookie has SameSite=Lax flag");

    // Extract cookie value for subsequent test
    const match = setCookie.match(/jopa_admin_auth=([^;]+)/);
    if (match) {
      authCookie = `jopa_admin_auth=${match[1]}`;
    }
  } catch (err) {
    assert(false, `Authentication API test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 8: Authenticated Access to Admin Portal (/portal)
  // -------------------------------------------------------------
  console.log("\nTEST SUITE 8: Authenticated Admin Portal Operations");
  try {
    assert(Boolean(authCookie), "Obtained valid session cookie from login");

    const authPortalRes = await fetch(`${BASE_URL}/portal`, {
      headers: { Cookie: authCookie },
      redirect: "manual",
    });

    assert(authPortalRes.status === 200, `Authenticated request to /portal returns HTTP 200 OK (Got: ${authPortalRes.status})`);
    
    const portalHtml = await authPortalRes.text();
    assert(portalHtml.includes("Operations Dashboard") || portalHtml.includes("Control Center"), "Renders 'Control Center' dashboard");
    assert(portalHtml.includes("Polls &amp; Surveys") || portalHtml.includes("Polls"), "Contains 'Polls & Surveys' tab");
    assert(portalHtml.includes("Candidates"), "Contains 'Candidates' tab");
    assert(portalHtml.includes("Contact Inbox"), "Contains 'Contact Inbox' tab");
    assert(portalHtml.includes("Share Links"), "Contains 'Share Links' tab");
    assert(portalHtml.includes("Sign Out"), "Contains 'Sign Out' action");
  } catch (err) {
    assert(false, `Authenticated portal test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Test 9: Admin Logout API (/api/portal/logout)
  // -------------------------------------------------------------
  console.log("\nTEST SUITE 9: Admin Session Invalidation (/api/portal/logout)");
  try {
    const logoutRes = await fetch(`${BASE_URL}/api/portal/logout`, {
      method: "POST",
      headers: { Cookie: authCookie },
    });
    assert(logoutRes.status === 200, `Logout returns HTTP 200 OK (Got: ${logoutRes.status})`);

    const clearCookieHeader = logoutRes.headers.get("set-cookie") || "";
    assert(
      clearCookieHeader.includes("jopa_admin_auth=;") ||
      clearCookieHeader.includes("Max-Age=0") ||
      clearCookieHeader.includes("expires="),
      "Logout response clears session cookie"
    );
  } catch (err) {
    assert(false, `Logout API test failed: ${err.message}`);
  }

  // -------------------------------------------------------------
  // Summary
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`LIVE TEST RESULTS: ${passed} PASSED / ${failed} FAILED (Total: ${passed + failed})`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runTests();
