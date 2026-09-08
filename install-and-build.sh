#!/bin/bash
cd /Users/xyz/dropfund-icp-new/frontend

echo "Installing all missing dependencies..."
npm install \
  @radix-ui/react-dialog \
  @radix-ui/react-tabs \
  @radix-ui/react-label \
  @radix-ui/react-select \
  @radix-ui/react-avatar \
  @radix-ui/react-progress \
  class-variance-authority

echo "Building frontend..."
npm run build

echo "Build complete! Check the output above for any errors."
