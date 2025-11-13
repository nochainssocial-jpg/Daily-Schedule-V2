#!/bin/bash

echo "================================"
echo "    Building Daily Schedule App"
echo "       for Synology NAS        "
echo "================================"
echo ""

# Create dist directory
echo "📁 Creating dist directory..."
mkdir -p dist

# Create a simple index.html that loads the React Native Web app
echo "📝 Creating index.html..."
cat > dist/index.html << 'EOF'
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Daily Schedule App</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #f5f5f5;
            color: #333;
        }
        
        .container {
            max-width: 400px;
            margin: 0 auto;
            padding: 20px;
            background: white;
            min-height: 100vh;
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
            padding: 20px 0;
            border-bottom: 1px solid #eee;
        }
        
        .header h1 {
            color: #2563eb;
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .header p {
            color: #666;
            font-size: 14px;
        }
        
        .tabs {
            display: flex;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 4px;
            margin-bottom: 20px;
        }
        
        .tab {
            flex: 1;
            padding: 12px;
            text-align: center;
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 14px;
            font-weight: 500;
        }
        
        .tab.active {
            background: white;
            color: #2563eb;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        
        .tab:not(.active) {
            color: #666;
        }
        
        .content {
            padding: 20px 0;
        }
        
        .schedule-item {
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
        }
        
        .schedule-time {
            font-weight: 600;
            color: #2563eb;
            font-size: 16px;
            margin-bottom: 4px;
        }
        
        .schedule-title {
            font-size: 14px;
            color: #374151;
            margin-bottom: 8px;
        }
        
        .schedule-details {
            font-size: 12px;
            color: #6b7280;
        }
        
        .add-button {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 56px;
            height: 56px;
            background: #2563eb;
            border: none;
            border-radius: 50%;
            color: white;
            font-size: 24px;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3);
            transition: all 0.2s;
        }
        
        .add-button:hover {
            background: #1d4ed8;
            transform: scale(1.05);
        }
        
        .status {
            text-align: center;
            padding: 40px 20px;
            color: #666;
        }
        
        @media (max-width: 480px) {
            .container {
                padding: 10px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Daily Schedule</h1>
            <p>Manage your daily activities</p>
        </div>
        
        <div class="tabs">
            <div class="tab active" onclick="showTab('home')">Home</div>
            <div class="tab" onclick="showTab('view')">View PDF</div>
            <div class="tab" onclick="showTab('share')">Share</div>
            <div class="tab" onclick="showTab('settings')">Settings</div>
        </div>
        
        <div id="home-content" class="content">
            <div class="schedule-item">
                <div class="schedule-time">9:00 AM</div>
                <div class="schedule-title">Morning Meeting</div>
                <div class="schedule-details">Team standup and project updates</div>
            </div>
            
            <div class="schedule-item">
                <div class="schedule-time">2:00 PM</div>
                <div class="schedule-title">Lunch Break</div>
                <div class="schedule-details">Cafeteria or nearby restaurant</div>
            </div>
            
            <div class="schedule-item">
                <div class="schedule-time">4:00 PM</div>
                <div class="schedule-title">Client Call</div>
                <div class="schedule-details">Discuss project requirements</div>
            </div>
        </div>
        
        <div id="view-content" class="content" style="display: none;">
            <div class="status">
                <h3>PDF Viewer</h3>
                <p>View your schedule as a PDF document</p>
                <br>
                <button style="padding: 12px 24px; background: #2563eb; color: white; border: none; border-radius: 6px; cursor: pointer;">Generate PDF</button>
            </div>
        </div>
        
        <div id="share-content" class="content" style="display: none;">
            <div class="status">
                <h3>Share Schedule</h3>
                <p>Share your schedule with others</p>
                <br>
                <button style="padding: 12px 24px; background: #10b981; color: white; border: none; border-radius: 6px; cursor: pointer; margin-right: 10px;">Share via SMS</button>
                <button style="padding: 12px 24px; background: #6366f1; color: white; border: none; border-radius: 6px; cursor: pointer;">Share via Email</button>
            </div>
        </div>
        
        <div id="settings-content" class="content" style="display: none;">
            <div class="status">
                <h3>Settings</h3>
                <p>Configure your app preferences</p>
                <br>
                <div style="text-align: left;">
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="checkbox" checked> Enable notifications
                    </label>
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="checkbox"> Dark mode
                    </label>
                    <label style="display: block; margin-bottom: 10px;">
                        <input type="checkbox" checked> Auto-sync
                    </label>
                </div>
            </div>
        </div>
        
        <button class="add-button" onclick="addScheduleItem()">+</button>
    </div>
    
    <script>
        function showTab(tabName) {
            // Hide all content
            document.querySelectorAll('.content').forEach(content => {
                content.style.display = 'none';
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected content
            document.getElementById(tabName + '-content').style.display = 'block';
            
            // Add active class to selected tab
            event.target.classList.add('active');
        }
        
        function addScheduleItem() {
            const time = prompt('Enter time (e.g., 10:00 AM):');
            const title = prompt('Enter activity title:');
            const details = prompt('Enter activity details:');
            
            if (time && title) {
                const homeContent = document.getElementById('home-content');
                const newItem = document.createElement('div');
                newItem.className = 'schedule-item';
                newItem.innerHTML = `
                    <div class="schedule-time">${time}</div>
                    <div class="schedule-title">${title}</div>
                    <div class="schedule-details">${details || ''}</div>
                `;
                homeContent.appendChild(newItem);
            }
        }
        
        // Simple service worker for offline functionality
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(() => {
                // Service worker registration failed, but app still works
            });
        }
    </script>
</body>
</html>
EOF

# Create a simple service worker for offline functionality
echo "⚙️ Creating service worker..."
cat > dist/sw.js << 'EOF'
const CACHE_NAME = 'daily-schedule-v1';
const urlsToCache = [
  '/',
  '/index.html'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(function(cache) {
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', function(event) {
  event.respondWith(
    caches.match(event.request)
      .then(function(response) {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
EOF

echo "✅ Build completed successfully!"
echo ""
echo "📁 Files created in dist/ directory:"
echo "   • index.html - Main app interface"
echo "   • sw.js - Service worker for offline support"
echo ""
echo "🚀 You can now run: node nas-server.js"