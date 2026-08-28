# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Deployment Workflow

When the user asks to push, deploy, or update the app (or when you finish a feature), DO NOT run `eas update` manually. Instead, you MUST commit the changes and push them to GitHub (`git add . && git commit -m '...' && git push origin master`). The repository has GitHub Actions configured that will automatically build and deploy both the Web app (GitHub Pages) and the Android/iOS app (EAS OTA) whenever a push is made to the master branch.
