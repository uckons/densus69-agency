#!/bin/bash

# Function to wrap a content-only page with full admin layout
wrap_page() {
    local page_file=$1
    local page_title=$2
    local active_menu=$3
    
    # Backup original content
    cp "$page_file" "$page_file.content-only"
    
    # Read the original content
    content=$(cat "$page_file.content-only")
    
    # Create new file with full wrapper
    cat > "$page_file" << EOF
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${page_title} - Densus69 Agency</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script>
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        admin: {
                            50: '#eff6ff',
                            100: '#dbeafe',
                            200: '#bfdbfe',
                            300: '#93c5fd',
                            400: '#60a5fa',
                            500: '#3b82f6',
                            600: '#2563eb',
                            700: '#1d4ed8',
                            800: '#1e40af',
                            900: '#1e3a8a',
                        }
                    }
                }
            }
        }
    </script>
</head>
<body class="bg-gray-50">
    <%- include('../partials/header') %>
    
    <div class="flex h-screen bg-gray-100">
        <!-- Sidebar -->
        <aside id="sidebar" class="sidebar fixed md:relative inset-y-0 left-0 z-30 w-64 bg-admin-800 text-white transform -translate-x-full md:translate-x-0 transition-transform duration-300">
            <div class="flex flex-col h-full">
                <!-- Logo -->
                <div class="flex items-center justify-between h-16 px-6 bg-admin-900">
                    <div class="flex items-center space-x-2">
                        <i class="fas fa-star text-admin-400 text-xl"></i>
                        <span class="text-xl font-bold">Admin Panel</span>
                    </div>
                    <button id="close-sidebar" class="md:hidden text-white hover:text-admin-300">
                        <i class="fas fa-times text-xl"></i>
                    </button>
                </div>
                
                <!-- Navigation -->
                <nav class="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                    <a href="/admin/dashboard" class="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-admin-700 transition $([ "$active_menu" = "dashboard" ] && echo "bg-admin-700")">
                        <i class="fas fa-tachometer-alt w-5"></i>
                        <span>Dashboard</span>
                    </a>
                    
                    <a href="/admin/models" class="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-admin-700 transition $([ "$active_menu" = "models" ] && echo "bg-admin-700")">
                        <i class="fas fa-users w-5"></i>
                        <span>Models</span>
                    </a>
                    
                    <a href="/admin/jobs" class="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-admin-700 transition $([ "$active_menu" = "jobs" ] && echo "bg-admin-700")">
                        <i class="fas fa-briefcase w-5"></i>
                        <span>Jobs</span>
                    </a>
                    
                    <a href="/admin/transactions" class="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-admin-700 transition $([ "$active_menu" = "transactions" ] && echo "bg-admin-700")">
                        <i class="fas fa-exchange-alt w-5"></i>
                        <span>Transactions</span>
                    </a>
                    
                    <a href="/admin/analytics" class="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-admin-700 transition $([ "$active_menu" = "analytics" ] && echo "bg-admin-700")">
                        <i class="fas fa-chart-line w-5"></i>
                        <span>Analytics</span>
                    </a>
                    
                    <a href="/admin/complaints" class="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-admin-700 transition $([ "$active_menu" = "complaints" ] && echo "bg-admin-700")">
                        <i class="fas fa-exclamation-triangle w-5"></i>
                        <span>Complaints</span>
                    </a>
                    
                    <hr class="my-4 border-admin-700">
                    
                    <a href="/" class="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-admin-700 transition">
                        <i class="fas fa-home w-5"></i>
                        <span>Public Site</span>
                    </a>
                    
                    <a href="/auth/logout" class="flex items-center space-x-3 px-4 py-3 rounded-lg hover:bg-red-600 transition text-red-300">
                        <i class="fas fa-sign-out-alt w-5"></i>
                        <span>Logout</span>
                    </a>
                </nav>
                
                <!-- User Info -->
                <div class="px-6 py-4 bg-admin-900 border-t border-admin-700">
                    <div class="flex items-center space-x-3">
                        <img src="/images/default-avatar.png" 
                             alt="Admin" 
                             class="w-10 h-10 rounded-full object-cover border-2 border-admin-600">
                        <div>
                            <p class="font-medium"><%= typeof user !== 'undefined' ? user.email : 'Admin' %></p>
                            <p class="text-xs text-admin-300">Administrator</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
        
        <!-- Main Content -->
        <div class="flex-1 flex flex-col overflow-hidden">
            <!-- Top Bar -->
            <header class="bg-white shadow-sm h-16 flex items-center justify-between px-6">
                <button id="open-sidebar" class="md:hidden text-gray-600 hover:text-gray-900">
                    <i class="fas fa-bars text-2xl"></i>
                </button>
                
                <h1 class="text-xl font-semibold text-gray-800">${page_title}</h1>
                
                <div class="flex items-center space-x-4">
                    <a href="/auth/logout" class="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg transition">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout
                    </a>
                </div>
            </header>
            
            <!-- Page Content -->
            <main class="flex-1 overflow-y-auto p-6">
${content}
            </main>
        </div>
    </div>
    
    <!-- Sidebar Toggle Script -->
    <script>
        const sidebar = document.getElementById('sidebar');
        const openBtn = document.getElementById('open-sidebar');
        const closeBtn = document.getElementById('close-sidebar');
        
        openBtn?.addEventListener('click', () => {
            sidebar.classList.remove('-translate-x-full');
        });
        
        closeBtn?.addEventListener('click', () => {
            sidebar.classList.add('-translate-x-full');
        });
        
        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth < 768 && 
                !sidebar.contains(e.target) && 
                !openBtn.contains(e.target) &&
                !sidebar.classList.contains('-translate-x-full')) {
                sidebar.classList.add('-translate-x-full');
            }
        });
    </script>
    
    <%- include('../partials/footer') %>
</body>
</html>
EOF
    
    echo "✅ Wrapped $page_file with layout"
}

# Wrap all content-only pages
wrap_page "views/admin/models-list.ejs" "Models Management" "models"
wrap_page "views/admin/transactions.ejs" "Transactions" "transactions"
wrap_page "views/admin/revenue-analytics.ejs" "Revenue Analytics" "analytics"
wrap_page "views/admin/complaints.ejs" "Complaints" "complaints"
wrap_page "views/admin/model-edit.ejs" "Edit Model" "models"
wrap_page "views/admin/transaction-form.ejs" "Add Transaction" "transactions"

echo "🎉 All pages wrapped!"
