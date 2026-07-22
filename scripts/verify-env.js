const fs = require('fs');
const path = require('path');

try {
    const envPath = path.join(process.cwd(), '.env');
    if (!fs.existsSync(envPath)) {
        console.error("❌ .env file not found!");
        process.exit(1);
    }

    const content = fs.readFileSync(envPath, 'utf8');
    const env = {};

    content.split('\n').forEach(line => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
            const firstEquals = trimmed.indexOf('=');
            if (firstEquals > -1) {
                const key = trimmed.slice(0, firstEquals).trim();
                // Remove wrapping quotes if present
                let val = trimmed.slice(firstEquals + 1).trim();
                if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
                    val = val.slice(1, -1);
                }
                env[key] = val;
            }
        }
    });

    let hasError = false;

    console.log("--- Environment Variable Check ---");

    // Check AUTH_SECRET
    if (!env.AUTH_SECRET) {
        console.error("❌ AUTH_SECRET: Missing");
        hasError = true;
    } else if (env.AUTH_SECRET === "default-secret-key-change-in-prod" || env.AUTH_SECRET.length < 32) {
        console.warn("⚠️  AUTH_SECRET: Value looks insecure or is using default");
        // Not a fatal error for the check, but warning
    } else {
        console.log("✅ AUTH_SECRET: Present and valid format");
    }

    // Check DATABASE_URL
    if (!env.DATABASE_URL) {
        console.error("❌ DATABASE_URL: Missing");
        hasError = true;
    } else {
        console.log("✅ DATABASE_URL: Present");
    }

    if (hasError) process.exit(1);
    console.log("--- Environment syntax looks good ---");

} catch (err) {
    console.error("Script error:", err);
    process.exit(1);
}
