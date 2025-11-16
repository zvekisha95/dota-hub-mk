# Zvekisha Dota Hub

Private Macedonian Dota 2 community hub built with Firebase + Steam Login.

## Features
- Email & Steam authentication  
- Forum (threads + comments)  
- User roles: admin, moderator, member  
- Admin panel + maintenance mode  
- Moderation tools  
- Live match tracking via OpenDota  
- Online users counter  
- Country & flag detection  

## Tech
- Firebase Auth  
- Firestore Database  
- Steam OpenID → Custom Firebase Token  
- OpenDota API  
- Vercel Serverless Functions  

## Structure
- /js → site logic  
- /api → Steam login backend  
- *.html → pages  

## Deployment
1. Upload project to GitHub  
2. Connect to Vercel  
3. Add env variables:  
   - FB_PROJECT_ID  
   - FB_CLIENT_EMAIL  
   - FB_PRIVATE_KEY  
   - STEAM_CALLBACK_URL  

## Author
Made by **Zvekisha**
