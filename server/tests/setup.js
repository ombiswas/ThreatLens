// Test environment setup for Vitest
process.env.NODE_ENV = "test";
process.env.PORT = "5001";
process.env.CLIENT_URL = "http://localhost:5173";
process.env.MONGO_URI = "mongodb://127.0.0.1:27017/test_db";
process.env.JWT_SECRET = "test_super_secret_jwt_key_that_is_at_least_32_chars_long";
process.env.JWT_EXPIRES_IN = "1h";
process.env.ML_SERVICE_URL = "http://localhost:7860";
process.env.ML_API_KEY = "test_secret_ml_api_key";
process.env.LOG_LEVEL = "silent";
