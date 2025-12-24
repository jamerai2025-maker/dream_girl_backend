# Cloudinary Integration - Setup Instructions

## 🎯 Overview

Your Nova AI backend now supports **Cloudinary cloud storage** for character images with automatic fallback to local storage.

## 📋 Setup Steps

### 1. Get Cloudinary Credentials

1. Go to [Cloudinary Console](https://cloudinary.com/console)
2. Sign up or log in
3. Copy your credentials from the dashboard:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### 2. Add to Environment Variables

Add these to your `.env` file:

```env
# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name_here
CLOUDINARY_API_KEY=your_api_key_here
CLOUDINARY_API_SECRET=your_api_secret_here
CLOUDINARY_FOLDER=nova-ai/characters
```

### 3. Restart Your Server

```bash
# If using Docker
docker-compose restart app

# If running locally
npm run dev
```

## ✅ How It Works

### Automatic Fallback Strategy

1. **Cloudinary First**: If credentials are configured, images upload to Cloudinary
2. **Local Fallback**: If Cloudinary fails or isn't configured, saves to `public/assets/characters/`

### Image URLs

- **Cloudinary**: `https://res.cloudinary.com/your-cloud/image/upload/v1234567890/nova-ai/characters/character_name.png`
- **Local**: `http://localhost:8088/assets/characters/character_name.png`

## 🧪 Testing

### Test Without Cloudinary
- Don't add credentials to `.env`
- Create a character
- Image saves to `public/assets/characters/`

### Test With Cloudinary
- Add credentials to `.env`
- Restart server
- Create a character
- Check Cloudinary dashboard for uploaded image

## 📁 File Changes

- ✅ **New**: `src/config/cloudinary.js` - Cloudinary configuration
- ✅ **Modified**: `src/services/aiImageGeneration.service.js` - Upload logic
- ✅ **Modified**: `.env.example` - Documentation

## 🔧 Configuration Options

### Cloudinary Folder Structure

Default: `nova-ai/characters`

Change in `.env`:
```env
CLOUDINARY_FOLDER=your-custom-folder/path
```

### Image Optimization

Cloudinary automatically applies:
- Quality: `auto:good`
- Format: `auto` (WebP for supported browsers)

## 🚨 Important Notes

1. **Credentials Security**: Never commit `.env` file to Git
2. **Fallback**: Local storage works if Cloudinary fails
3. **Existing Images**: Old local images remain in `public/assets/characters/`
4. **Migration**: No automatic migration of existing images

## 📞 Support

Check logs for Cloudinary status:
```bash
docker-compose logs -f app | grep Cloudinary
```

Expected logs:
- `✅ Cloudinary configured successfully` - Ready to use
- `⚠️ Cloudinary not configured` - Using local storage
- `💾 Image saved to Cloudinary: <url>` - Upload successful
- `📁 Using local file storage` - Fallback active
