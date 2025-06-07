// // /konnekt/sockets.js

// document.addEventListener("DOMContentLoaded", () => {
//     const currentUserID = window.currentUserID;
//     const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
//     const RECONNECT_DELAY = 5000; // Delay for reconnection attempts
//     let recentChatsSocket = null;
//     let recentChatsReconnectTimeout = null;

//     const recentChatsList = document.getElementById("recent-chats-list");

//     // Function to format time in a human-readable way
//     const naturalTime = (dateString) => {
//         if (!dateString) return "Never";
        
//         try {
//             const date = new Date(dateString);
//             const now = new Date();
//             const delta = (now - date) / 1000;

//             if (delta < 60) return "Just now";
//             if (delta < 3600) return `${Math.floor(delta / 60)} min ago`;
//             if (delta < 86400) return `${Math.floor(delta / 3600)} hrs ago`;
//             if (delta < 172800) return "Yesterday";
            
//             return date.toLocaleDateString();
//         } catch {
//             return dateString; // Return original string if parsing fails
//         }
//     };

//     // Function to render recent chats in the UI
//     const renderRecentChats = (chats) => {
//         const recentChatsList = document.getElementById("recent-chats-list");
//         if (!recentChatsList) return;

//         recentChatsList.innerHTML = chats.map(chat => {
//             const isGroup = chat.is_group;
//             const friend = chat.participants[0];
//             const avatar = friend.avatar_url;
//             const title = chat.title || friend.username;
//             const chatID = chat.c_id;
//             const lastMessage = chat.last_message || "No message yet";
//             const time = naturalTime(chat.timestamp) || "Just now";

//             return `
//             <li class="tyn-aside-item js-toggle-main">
//                 <a href="/konnekt/${chatID}/" class="tyn-media-group">
//                     <div class="tyn-media tyn-size-lg">
//                         <img src="${avatar}" alt="">
//                     </div>
//                     <div class="tyn-media-col">
//                         <div class="tyn-media-row">
//                             <h6 class="name">${title}</h6>
//                             <div class="indicator varified">
//                                 <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
//                                     <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
//                                 </svg>
//                             </div>
//                         </div>
//                         <div class="tyn-media-row has-dot-sap">
//                             <p class="content">${lastMessage}</p>
//                             <span class="meta">${time}</span>
//                         </div>
//                     </div>
//                     <div class="tyn-media-option tyn-aside-item-option">
//                         <ul class="tyn-media-option-list">
//                             <li class="dropdown">
//                                 <button class="btn btn-icon btn-white btn-pill dropdown-toggle" data-bs-toggle="dropdown" data-bs-offset="0,0" data-bs-auto-close="outside">
//                                     <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
//                                         <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
//                                     </svg>
//                                 </button>
//                                 <div class="dropdown-menu dropdown-menu-end">
//                                     <ul class="tyn-list-links">
//                                         <li><a href="#"><span>Mark as Read</span></a></li>
//                                         <li><a href="#"><span>Mute Notifications</span></a></li>
//                                         <li><a href="contacts.html"><span>View Profile</span></a></li>
//                                         <li class="dropdown-divider"></li>
//                                         <li><a href="#"><span>Archive</span></a></li>
//                                         <li><a href="#deleteChat" data-bs-toggle="modal"><span>Delete</span></a></li>
//                                         <li><a href="#"><span>Report</span></a></li>
//                                     </ul>
//                                 </div>
//                             </li>
//                         </ul>
//                     </div>
//                 </a>
//             </li>
//             `;
//         }).join('');
//     };


//     // Function to connect to the recent chats WebSocket
//     const connectRecentChatsSocket = () => {
//         // Close existing socket if it exists
//         if (recentChatsSocket) {
//             recentChatsSocket.close();
//             clearTimeout(recentChatsReconnectTimeout);
//         }

//         const wsUrl = `${wsProtocol}://${window.location.host}/ws/konnekt/recent-chats/${currentUserID}/`;
//         recentChatsSocket = new WebSocket(wsUrl);

//         recentChatsSocket.onopen = () => {
//             console.log("Recent chats socket open.");
//         };

//         recentChatsSocket.onmessage = (event) => {
//             console.log("Message received:", event.data);
//             const chats = JSON.parse(event.data);
//             renderRecentChats(chats.recent_chats);
//         };

//         recentChatsSocket.onclose = (event) => {
//             console.log("Recent chats socket closed:", event);
//             recentChatsReconnectTimeout = setTimeout(connectRecentChatsSocket, RECONNECT_DELAY);
//         };

//         recentChatsSocket.onerror = (error) => {
//             console.error("WebSocket error:", error);
//         };
//     };

//     connectRecentChatsSocket();
// });








// /konnekt/sockets.js

document.addEventListener("DOMContentLoaded", () => {
    const currentUserID = window.currentUserID;
    const wsProtocol = window.location.protocol === "https:" ? "wss" : "ws";
    const RECONNECT_DELAY = 5000; // base delay for reconnection attempts
    const MAX_RECONNECT_DELAY = 60000; // cap maximum delay
    let recentChatsSocket = null;
    let recentChatsReconnectTimeout = null;
    let reconnectAttempts = 0; // for exponential backoff

    const recentChatsList = document.getElementById("recent-chats-list");

    // Escape HTML to prevent XSS
    const escapeHtml = (unsafe) =>
        String(unsafe).replace(/[&<"'>]/g, tag =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[tag]
        );

    // Format timestamps in a friendly way
    const naturalTime = (dateString) => {
        if (!dateString) return "Never";

        try {
            const date = new Date(dateString);
            const now = new Date();
            const delta = (now - date) / 1000;

            if (delta < 60) return "Just now";
            if (delta < 3600) return `${Math.floor(delta / 60)} min ago`;
            if (delta < 86400) return `${Math.floor(delta / 3600)} hrs ago`;
            if (delta < 172800) return "Yesterday";

            return date.toLocaleDateString();
        } catch {
            return escapeHtml(dateString); // fallback to safe original
        }
    };

    // Render recent chats to the DOM
    const renderRecentChats = (chats) => {
        if (!Array.isArray(chats) || !recentChatsList) return;

        // Handle empty state gracefully
        if (chats.length === 0) {
            recentChatsList.innerHTML = `<li class="text-center text-muted py-3">No recent chats</li>`;
            return;
        }

        // Build list HTML
        recentChatsList.innerHTML = chats.map(chat => {
            const isGroup = chat.is_group;
            const friend = chat.participants?.[0] || {};
            const avatar = escapeHtml(friend.avatar_url);
            const title = escapeHtml(chat.title || friend.username);
            const chatID = escapeHtml(chat.c_id);
            const lastMessage = escapeHtml(chat.last_message || "No message yet");
            const time = naturalTime(chat.timestamp);

            return `
            <li class="tyn-aside-item js-toggle-main">
                <a href="/konnekt/${chatID}/" class="tyn-media-group">
                    <div class="tyn-media tyn-size-lg">
                        <img src="${avatar}" alt="">
                    </div>
                    <div class="tyn-media-col">
                        <div class="tyn-media-row">
                            <h6 class="name">${title}</h6>
                            <div class="indicator varified">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-check-circle-fill" viewBox="0 0 16 16">
                                    <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
                                </svg>
                            </div>
                        </div>
                        <div class="tyn-media-row has-dot-sap">
                            <p class="content">${lastMessage}</p>
                            <span class="meta">${time}</span>
                        </div>
                    </div>
                    <div class="tyn-media-option tyn-aside-item-option">
                        <ul class="tyn-media-option-list">
                            <li class="dropdown">
                                <button class="btn btn-icon btn-white btn-pill dropdown-toggle" data-bs-toggle="dropdown" data-bs-offset="0,0" data-bs-auto-close="outside">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-three-dots" viewBox="0 0 16 16">
                                        <path d="M3 9.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3zm5 0a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                                    </svg>
                                </button>
                                <div class="dropdown-menu dropdown-menu-end">
                                    <ul class="tyn-list-links">
                                        <li><a href="#"><span>Mark as Read</span></a></li>
                                        <li><a href="#"><span>Mute Notifications</span></a></li>
                                        <li><a href="contacts.html"><span>View Profile</span></a></li>
                                        <li class="dropdown-divider"></li>
                                        <li><a href="#"><span>Archive</span></a></li>
                                        <li><a href="#deleteChat" data-bs-toggle="modal"><span>Delete</span></a></li>
                                        <li><a href="#"><span>Report</span></a></li>
                                    </ul>
                                </div>
                            </li>
                        </ul>
                    </div>
                </a>
            </li>
            `;
        }).join('');
    };

    // Establish the WebSocket connection
    const connectRecentChatsSocket = () => {
        if (recentChatsSocket) {
            recentChatsSocket.close();
            clearTimeout(recentChatsReconnectTimeout);
        }

        // Show loading state
        recentChatsList.innerHTML = `<li class="text-center text-muted py-3">Loading recent chats...</li>`;

        const wsUrl = `${wsProtocol}://${window.location.host}/ws/konnekt/recent-chats/${currentUserID}/`;
        recentChatsSocket = new WebSocket(wsUrl);

        recentChatsSocket.onopen = () => {
            console.log("Recent chats socket open.");
            reconnectAttempts = 0; // reset backoff
        };

        recentChatsSocket.onmessage = (event) => {
            console.log("Message received:", event.data);

            try {
                const data = JSON.parse(event.data);

                if (data.type === "recent_chats" && Array.isArray(data.recent_chats)) {
                    renderRecentChats(data.recent_chats);
                } else {
                    console.warn("Unexpected WebSocket message:", data);
                }
            } catch (err) {
                console.error("Invalid WebSocket message:", err);
            }
        };

        recentChatsSocket.onclose = (event) => {
            console.warn("Recent chats socket closed:", event);
            reconnectAttempts++;
            const delay = Math.min(RECONNECT_DELAY * 2 ** reconnectAttempts, MAX_RECONNECT_DELAY);
            recentChatsReconnectTimeout = setTimeout(connectRecentChatsSocket, delay);
        };

        recentChatsSocket.onerror = (error) => {
            console.error("WebSocket error:", error);
        };
    };

    // Initialize socket
    connectRecentChatsSocket();
});
