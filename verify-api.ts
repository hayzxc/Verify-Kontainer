async function verifyApi() {
    const baseUrl = "http://localhost:3000/api/auth"

    console.log("Testing Signup...")
    try {
        const signupRes = await fetch(`${baseUrl}/signup`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "test@example.com",
                password: "password123",
                name: "Test User",
                role: "verificator"
            })
        })

        if (signupRes.status === 409) {
            console.log("User already exists (Expected if run multiple times)")
        } else if (!signupRes.ok) {
            console.error("Signup failed:", await signupRes.text())
        } else {
            console.log("Signup successful:", await signupRes.json())
        }
    } catch (e) {
        console.error("Signup error:", e)
    }

    console.log("\nTesting Login...")
    try {
        const loginRes = await fetch(`${baseUrl}/login`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                email: "test@example.com",
                password: "password123"
            })
        })

        if (!loginRes.ok) {
            console.error("Login failed:", await loginRes.text())
        } else {
            console.log("Login successful:", await loginRes.json())
        }
    } catch (e) {
        console.error("Login error:", e)
    }
}

verifyApi()
