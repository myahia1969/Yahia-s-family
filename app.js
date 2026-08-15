/**
 * ============================================================================
 * عائلة يحيي صبيح - Yahia Sobeih Family Real-time Chat Application
 * Pure Vanilla JavaScript (ES6+) with Firebase Realtime Database & Storage
 * ============================================================================
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  setDoc,
  getDoc,
  getDocFromServer,
  onSnapshot,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // 1. App State & Constants
  // --------------------------------------------------------------------------
  const STORAGE_KEYS = {
    USER_NAME: 'yahia_family_user_name',
    USER_AVATAR_COLOR: 'yahia_family_user_avatar_color',
    USER_AVATAR_IMAGE: 'yahia_family_user_avatar_image',
    FAMILY_AVATARS: 'yahia_family_members_avatars',
    FAMILY_MEMBERS: 'yahia_family_members_list',
    FB_CONFIG: 'yahia_family_firebase_config',
    MESSAGES_CACHE: 'yahia_family_cached_messages',
    PINNED_ANNOUNCEMENT: 'yahia_family_pinned_announcement',
    FAMILY_EVENTS: 'yahia_family_events_list',
    FAMILY_MEMORIES: 'yahia_family_memories_list',
    SOUND_ENABLED: 'yahia_family_sound_enabled',
    SYNC_ACTION: 'yahia_family_sync_action'
  };

  // Default Preset Family Members
  const DEFAULT_FAMILY_MEMBERS = [
    'يحيي صبيح (الوالد)',
    'أم محمد (الوالدة)',
    'محمد يحيي صبيح',
    'أحمد يحيي صبيح',
    'محمود يحيي صبيح',
    'سارة يحيي صبيح',
    'فاطمة يحيي صبيح'
  ];

  // Preset Avatar Colors for Family Members
  const AVATAR_COLORS = [
    'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)',
    'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
    'linear-gradient(135deg, #ec4899 0%, #be185d 100%)',
    'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)',
    'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)'
  ];

  // Preset Curated Illustrated Family Avatars (SVG/Emoji badges)
  const PRESET_ILLUSTRATED_AVATARS = [
    { id: 'dad', emoji: '👨‍💼', label: 'الوالد الوقور', bg: '#0284c7' },
    { id: 'mom', emoji: '🧕', label: 'الوالدة الحنونة', bg: '#ec4899' },
    { id: 'grandpa', emoji: '👴', label: 'الجد الحكيم', bg: '#d97706' },
    { id: 'grandma', emoji: '👵', label: 'الجدة الطيبة', bg: '#8b5cf6' },
    { id: 'young_man', emoji: '👨‍💻', label: 'شاب / مهندس', bg: '#06b6d4' },
    { id: 'young_lady', emoji: '👩‍🎓', label: 'فتاة / خريجة', bg: '#10b981' },
    { id: 'boy', emoji: '👦', label: 'فتى العائلة', bg: '#3b82f6' },
    { id: 'girl', emoji: '👧', label: 'أميرة العائلة', bg: '#f43f5e' },
    { id: 'baby', emoji: '👶', label: 'أصغر العائلة', bg: '#fbbf24' },
    { id: 'crown', emoji: '👑', label: 'تاج الأسرة', bg: '#eab308' },
    { id: 'rose', emoji: '🌸', label: 'وردة الدار', bg: '#f472b6' },
    { id: 'star', emoji: '⭐', label: 'نجم العائلة', bg: '#6366f1' }
  ];

  // Application State Object
  const state = {
    currentUser: '',
    currentAvatarColor: '',
    currentUserAvatar: '', // Data URL or Preset Avatar
    tempSelectedAvatar: '', // Working avatar in modal
    familyAvatars: {}, // Mapping: { [memberName]: avatarDataUrl }
    familyMembers: [],
    messages: [],
    pinnedAnnouncement: null, // { title, text, sender, timestamp }
    familyEvents: [], // [{ id, title, date, category, member, notes }]
    familyMemories: [], // [{ id, caption, category, imageUrl, sender, timestamp }]
    currentAlbumFilter: 'all',
    activeAudioPlayer: null, // Track currently playing waveform player instance
    lightboxImages: [], // Gallery images for slideshow navigation
    lightboxCurrentIndex: 0,
    pendingAttachment: null, // { file, type, dataUrl, name, size }
    mediaRecorder: null,
    audioChunks: [],
    recordStartTime: 0,
    recordTimerInterval: null,
    isRecording: false,
    selectedDeleteId: null,
    searchQuery: '',
    soundEnabled: true,
    deferredInstallPrompt: null,
    isFirebaseReady: false,
    firestore: null,
    dbRef: null,
    announcementDbRef: null,
    eventsDbRef: null,
    storageRef: null,
    unsubscribeMessages: null,
    unsubscribeEvents: null,
    unsubscribeAnnouncements: null,
    unsubscribeMemories: null,
    unsubscribeRoster: null,
    unsubscribeAvatars: null,
    broadcastChannel: null,
    cameraStream: null,
    cameraFacingMode: 'user',
    capturedPhotoData: null,
    activeReplyTo: null, // { id, sender, text, mediaType } for WhatsApp quoting
    selectedDateFilter: null, // 'YYYY-MM-DD' or null for memories browsing
    activeReactionDockMsgId: null // tracks open WhatsApp reaction popover
  };

  // --------------------------------------------------------------------------
  // 2. DOM Elements Cache
  // --------------------------------------------------------------------------
  const DOM = {
    // Header & User
    headerUserName: document.getElementById('headerUserName'),
    headerUserAvatar: document.getElementById('headerUserAvatar'),
    userProfileBtn: document.getElementById('userProfileBtn'),
    pinnedAnnouncementBtn: document.getElementById('pinnedAnnouncementBtn'),
    pinnedBadgeDot: document.getElementById('pinnedBadgeDot'),
    familyCalendarBtn: document.getElementById('familyCalendarBtn'),
    eventsCountBadge: document.getElementById('eventsCountBadge'),
    familyRosterBtn: document.getElementById('familyRosterBtn'),
    networkStatusBadge: document.getElementById('networkStatusBadge'),
    networkStatusText: document.getElementById('networkStatusText'),
    searchToggleBtn: document.getElementById('searchToggleBtn'),
    dateFilterBtn: document.getElementById('dateFilterBtn'),
    dateFilterBadgeDot: document.getElementById('dateFilterBadgeDot'),
    mediaGalleryBtn: document.getElementById('mediaGalleryBtn'),
    settingsBtn: document.getElementById('settingsBtn'),
    pwaInstallBtn: document.getElementById('pwaInstallBtn'),
    pwaBanner: document.getElementById('pwaBanner'),
    pwaBannerInstallBtn: document.getElementById('pwaBannerInstallBtn'),
    pwaBannerDismissBtn: document.getElementById('pwaBannerDismissBtn'),

    // Top Pinned Announcement Banner
    pinnedAnnouncementBanner: document.getElementById('pinnedAnnouncementBanner'),
    pinnedTitle: document.getElementById('pinnedTitle'),
    pinnedSender: document.getElementById('pinnedSender'),
    pinnedText: document.getElementById('pinnedText'),
    editAnnouncementBtn: document.getElementById('editAnnouncementBtn'),
    togglePinnedBannerBtn: document.getElementById('togglePinnedBannerBtn'),

    // Date Filter / Memory Browser Banner
    dateFilterBanner: document.getElementById('dateFilterBanner'),
    activeFilteredDateText: document.getElementById('activeFilteredDateText'),
    activeFilteredDateCount: document.getElementById('activeFilteredDateCount'),
    prevDayFilterBtn: document.getElementById('prevDayFilterBtn'),
    openDateModalFromBannerBtn: document.getElementById('openDateModalFromBannerBtn'),
    nextDayFilterBtn: document.getElementById('nextDayFilterBtn'),
    clearDateFilterBtn: document.getElementById('clearDateFilterBtn'),

    // Search Bar
    searchBarContainer: document.getElementById('searchBarContainer'),
    searchInput: document.getElementById('searchInput'),
    clearSearchBtn: document.getElementById('clearSearchBtn'),
    searchResultsCount: document.getElementById('searchResultsCount'),

    // Main Chat Stream & Navigation
    chatMain: document.getElementById('chatMain'),
    messagesStream: document.getElementById('messagesStream'),
    familyWelcomeCard: document.getElementById('familyWelcomeCard'),
    chatNavControls: document.getElementById('chatNavControls'),
    scrollToTopBtn: document.getElementById('scrollToTopBtn'),
    scrollStepUpBtn: document.getElementById('scrollStepUpBtn'),
    scrollStepDownBtn: document.getElementById('scrollStepDownBtn'),
    scrollToBottomBtn: document.getElementById('scrollToBottomBtn'),
    unreadCountBadge: document.getElementById('unreadCountBadge'),
    quickGreetingPills: document.getElementById('quickGreetingPills'),

    // Reply-To Preview Bar
    replyPreviewBar: document.getElementById('replyPreviewBar'),
    replyToName: document.getElementById('replyToName'),
    replyToText: document.getElementById('replyToText'),
    cancelReplyBtn: document.getElementById('cancelReplyBtn'),

    // Progress & Preview
    uploadProgressBarContainer: document.getElementById('uploadProgressBarContainer'),
    uploadProgressBar: document.getElementById('uploadProgressBar'),
    uploadStatusText: document.getElementById('uploadStatusText'),
    uploadPercentText: document.getElementById('uploadPercentText'),
    attachmentPreviewBar: document.getElementById('attachmentPreviewBar'),
    previewThumbnail: document.getElementById('previewThumbnail'),
    previewFilename: document.getElementById('previewFilename'),
    previewFilesize: document.getElementById('previewFilesize'),
    quickSendAttachmentBtn: document.getElementById('quickSendAttachmentBtn'),
    cancelAttachmentBtn: document.getElementById('cancelAttachmentBtn'),

    // Emoji Bar
    quickEmojiBar: document.getElementById('quickEmojiBar'),

    // Footer & Input Form
    messageForm: document.getElementById('messageForm'),
    messageInput: document.getElementById('messageInput'),
    fileInput: document.getElementById('fileInput'),
    cameraInput: document.getElementById('cameraInput'),
    createPollBtn: document.getElementById('createPollBtn'),
    recordVoiceBtn: document.getElementById('recordVoiceBtn'),
    sendBtn: document.getElementById('sendBtn'),
    audioRecordingBar: document.getElementById('audioRecordingBar'),
    recordingTimer: document.getElementById('recordingTimer'),
    cancelRecordBtn: document.getElementById('cancelRecordBtn'),
    sendRecordBtn: document.getElementById('sendRecordBtn'),

    // Modals - User & Avatars
    userNameModal: document.getElementById('userNameModal'),
    closeUserModalBtn: document.getElementById('closeUserModalBtn'),
    memberPresetGrid: document.getElementById('memberPresetGrid'),
    openBulkFromUserModalBtn: document.getElementById('openBulkFromUserModalBtn'),
    customNameInput: document.getElementById('customNameInput'),
    saveUserNameBtn: document.getElementById('saveUserNameBtn'),

    // Avatar Customizer in User Modal
    userModalAvatarPreview: document.getElementById('userModalAvatarPreview'),
    userModalAvatarInitial: document.getElementById('userModalAvatarInitial'),
    userModalAvatarImg: document.getElementById('userModalAvatarImg'),
    uploadAvatarBtn: document.getElementById('uploadAvatarBtn'),
    openCameraAvatarBtn: document.getElementById('openCameraAvatarBtn'),
    togglePresetAvatarsBtn: document.getElementById('togglePresetAvatarsBtn'),
    removeAvatarBtn: document.getElementById('removeAvatarBtn'),
    avatarFileInput: document.getElementById('avatarFileInput'),
    avatarCameraInput: document.getElementById('avatarCameraInput'),
    presetAvatarsDrawer: document.getElementById('presetAvatarsDrawer'),
    closePresetAvatarsBtn: document.getElementById('closePresetAvatarsBtn'),
    presetAvatarsGrid: document.getElementById('presetAvatarsGrid'),

    // Live Camera Snapshot Modal
    cameraSnapshotModal: document.getElementById('cameraSnapshotModal'),
    closeCameraModalBtn: document.getElementById('closeCameraModalBtn'),
    cameraVideo: document.getElementById('cameraVideo'),
    cameraCapturedImg: document.getElementById('cameraCapturedImg'),
    cameraGuideRing: document.getElementById('cameraGuideRing'),
    cameraFlashFx: document.getElementById('cameraFlashFx'),
    cameraCanvas: document.getElementById('cameraCanvas'),
    switchCameraFacingBtn: document.getElementById('switchCameraFacingBtn'),
    cameraStatusLabel: document.getElementById('cameraStatusLabel'),
    cameraBeforeCaptureControls: document.getElementById('cameraBeforeCaptureControls'),
    cameraAfterCaptureControls: document.getElementById('cameraAfterCaptureControls'),
    snapPhotoBtn: document.getElementById('snapPhotoBtn'),
    cancelCameraBtn: document.getElementById('cancelCameraBtn'),
    useCapturedPhotoBtn: document.getElementById('useCapturedPhotoBtn'),
    retakePhotoBtn: document.getElementById('retakePhotoBtn'),

    // Bulk Family Members Modal
    bulkMembersModal: document.getElementById('bulkMembersModal'),
    closeBulkModalBtn: document.getElementById('closeBulkModalBtn'),
    cancelBulkModalBtn: document.getElementById('cancelBulkModalBtn'),
    bulkNamesTextarea: document.getElementById('bulkNamesTextarea'),
    bulkDetectedCount: document.getElementById('bulkDetectedCount'),
    previewBadgesCount: document.getElementById('previewBadgesCount'),
    bulkNamesPreviewGrid: document.getElementById('bulkNamesPreviewGrid'),
    loadSampleNamesBtn: document.getElementById('loadSampleNamesBtn'),
    clearBulkInputBtn: document.getElementById('clearBulkInputBtn'),
    saveBulkNamesBtn: document.getElementById('saveBulkNamesBtn'),

    // Delete Modal
    deleteModal: document.getElementById('deleteModal'),
    closeDeleteModalBtn: document.getElementById('closeDeleteModalBtn'),
    deleteMsgAvatar: document.getElementById('deleteMsgAvatar'),
    deleteMsgSender: document.getElementById('deleteMsgSender'),
    deleteMsgTime: document.getElementById('deleteMsgTime'),
    deleteMessagePreview: document.getElementById('deleteMessagePreview'),
    deleteSafetyCheck: document.getElementById('deleteSafetyCheck'),
    confirmDeleteBtn: document.getElementById('confirmDeleteBtn'),
    cancelDeleteBtn: document.getElementById('cancelDeleteBtn'),

    // Lightbox Modal & Slideshow
    lightboxModal: document.getElementById('lightboxModal'),
    lightboxImg: document.getElementById('lightboxImg'),
    lightboxSender: document.getElementById('lightboxSender'),
    lightboxTime: document.getElementById('lightboxTime'),
    lightboxDownloadBtn: document.getElementById('lightboxDownloadBtn'),
    closeLightboxBtn: document.getElementById('closeLightboxBtn'),
    lightboxPrevBtn: document.getElementById('lightboxPrevBtn'),
    lightboxNextBtn: document.getElementById('lightboxNextBtn'),

    // Media Gallery & Family Albums Modal
    mediaGalleryModal: document.getElementById('mediaGalleryModal'),
    closeGalleryModalBtn: document.getElementById('closeGalleryModalBtn'),
    galleryGrid: document.getElementById('galleryGrid'),
    galleryImgCount: document.getElementById('galleryImgCount'),
    galleryAlbumCount: document.getElementById('galleryAlbumCount'),
    galleryVidCount: document.getElementById('galleryVidCount'),
    galleryAudCount: document.getElementById('galleryAudCount'),
    galleryLinkCount: document.getElementById('galleryLinkCount'),
    albumFilterBar: document.getElementById('albumFilterBar'),
    openAddMemoryModalBtn: document.getElementById('openAddMemoryModalBtn'),

    // Add Memory Modal
    addMemoryModal: document.getElementById('addMemoryModal'),
    closeAddMemoryModalBtn: document.getElementById('closeAddMemoryModalBtn'),
    memoryAlbumCategory: document.getElementById('memoryAlbumCategory'),
    memoryCaptionInput: document.getElementById('memoryCaptionInput'),
    memoryDropzone: document.getElementById('memoryDropzone'),
    memoryPreviewImg: document.getElementById('memoryPreviewImg'),
    memoryFileInput: document.getElementById('memoryFileInput'),
    saveMemoryBtn: document.getElementById('saveMemoryBtn'),

    // Pinned Announcement Modal
    announcementModal: document.getElementById('announcementModal'),
    closeAnnouncementModalBtn: document.getElementById('closeAnnouncementModalBtn'),
    announcementTitleInput: document.getElementById('announcementTitleInput'),
    announcementTextInput: document.getElementById('announcementTextInput'),
    unpinAnnouncementBtn: document.getElementById('unpinAnnouncementBtn'),
    saveAnnouncementBtn: document.getElementById('saveAnnouncementBtn'),

    // Family Calendar & Events Modal
    eventsCalendarModal: document.getElementById('eventsCalendarModal'),
    closeEventsModalBtn: document.getElementById('closeEventsModalBtn'),
    upcomingEventsCount: document.getElementById('upcomingEventsCount'),
    toggleAddEventFormBtn: document.getElementById('toggleAddEventFormBtn'),
    addEventFormCard: document.getElementById('addEventFormCard'),
    eventCategorySelect: document.getElementById('eventCategorySelect'),
    eventTitleInput: document.getElementById('eventTitleInput'),
    eventDateInput: document.getElementById('eventDateInput'),
    eventMemberInput: document.getElementById('eventMemberInput'),
    eventNotesInput: document.getElementById('eventNotesInput'),
    saveNewEventBtn: document.getElementById('saveNewEventBtn'),
    cancelAddEventBtn: document.getElementById('cancelAddEventBtn'),
    eventsListContainer: document.getElementById('eventsListContainer'),

    // Delete Event Confirm Modal
    deleteEventConfirmModal: document.getElementById('deleteEventConfirmModal'),
    closeDeleteEventConfirmModalBtn: document.getElementById('closeDeleteEventConfirmModalBtn'),
    cancelDeleteEventBtn: document.getElementById('cancelDeleteEventBtn'),
    confirmDeleteEventActionBtn: document.getElementById('confirmDeleteEventActionBtn'),
    deleteEventTargetTitle: document.getElementById('deleteEventTargetTitle'),
    deleteEventTargetDate: document.getElementById('deleteEventTargetDate'),

    // Family Poll Create Modal
    pollCreateModal: document.getElementById('pollCreateModal'),
    closePollModalBtn: document.getElementById('closePollModalBtn'),
    pollQuestionInput: document.getElementById('pollQuestionInput'),
    pollOptionsList: document.getElementById('pollOptionsList'),
    addPollOptionBtn: document.getElementById('addPollOptionBtn'),
    pollMultiChoice: document.getElementById('pollMultiChoice'),
    submitPollBtn: document.getElementById('submitPollBtn'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    closeSettingsModalBtn: document.getElementById('closeSettingsModalBtn'),
    settingsCurrentName: document.getElementById('settingsCurrentName'),
    settingsChangeNameBtn: document.getElementById('settingsChangeNameBtn'),
    settingsFamilyCount: document.getElementById('settingsFamilyCount'),
    settingsManageBulkBtn: document.getElementById('settingsManageBulkBtn'),
    settingsOpenShortcutBtn: document.getElementById('settingsOpenShortcutBtn'),
    fbApiKey: document.getElementById('fbApiKey'),
    fbDbUrl: document.getElementById('fbDbUrl'),
    fbStorageBucket: document.getElementById('fbStorageBucket'),
    fbProjectId: document.getElementById('fbProjectId'),
    saveFbConfigBtn: document.getElementById('saveFbConfigBtn'),
    resetFbConfigBtn: document.getElementById('resetFbConfigBtn'),
    soundToggle: document.getElementById('soundToggle'),

    // Shortcut & Install Modal
    openShortcutModalBtn: document.getElementById('openShortcutModalBtn'),
    shortcutModal: document.getElementById('shortcutModal'),
    closeShortcutModalBtn: document.getElementById('closeShortcutModalBtn'),
    closeShortcutModalFooterBtn: document.getElementById('closeShortcutModalFooterBtn'),
    triggerNativeInstallBtn: document.getElementById('triggerNativeInstallBtn'),
    downloadDesktopShortcutBtn: document.getElementById('downloadDesktopShortcutBtn'),
    shortcutDeviceTabs: document.getElementById('shortcutDeviceTabs'),
    copyAppShareLinkBtn: document.getElementById('copyAppShareLinkBtn'),

    // Date Filter & Memory Browser Modal
    dateFilterModal: document.getElementById('dateFilterModal'),
    closeDateFilterModalBtn: document.getElementById('closeDateFilterModalBtn'),
    dateFilterInput: document.getElementById('dateFilterInput'),
    applyDatePickerBtn: document.getElementById('applyDatePickerBtn'),
    availableDatesList: document.getElementById('availableDatesList'),
    resetDateFilterModalBtn: document.getElementById('resetDateFilterModalBtn'),
    closeDateFilterFooterBtn: document.getElementById('closeDateFilterFooterBtn')
  };

  // --------------------------------------------------------------------------
  // In-App Toast Feedback Notification Helper
  // --------------------------------------------------------------------------
  function showToast(message, type = 'info', duration = 3000) {
    let container = document.getElementById('appToastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'appToastContainer';
      container.className = 'toast-notification-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast-notification ${type}`;

    let icon = '<i class="fa-solid fa-circle-info"></i>';
    if (type === 'success') icon = '<i class="fa-solid fa-circle-check"></i>';
    else if (type === 'error') icon = '<i class="fa-solid fa-circle-exclamation"></i>';

    toast.innerHTML = `${icon} <span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // --------------------------------------------------------------------------
  // 3. User Identification & Family Roster Management
  // --------------------------------------------------------------------------
  function initUserSession() {
    loadFamilyMembers();
    loadFamilyAvatars();

    const savedName = localStorage.getItem(STORAGE_KEYS.USER_NAME);
    const savedColor = localStorage.getItem(STORAGE_KEYS.USER_AVATAR_COLOR);
    const savedAvatar = localStorage.getItem(STORAGE_KEYS.USER_AVATAR_IMAGE);

    if (savedName && savedName.trim()) {
      state.currentUser = savedName.trim();
      state.currentAvatarColor = savedColor || getAvatarColor(savedName);
      state.currentUserAvatar = savedAvatar || state.familyAvatars[state.currentUser] || '';
      updateHeaderUserUI();
    } else {
      // Default to first family member immediately so all controls, greetings and inputs work seamlessly
      state.currentUser = (state.familyMembers && state.familyMembers[0]) ? state.familyMembers[0] : 'يحيي صبيح (الوالد)';
      state.currentAvatarColor = getAvatarColor(state.currentUser);
      state.currentUserAvatar = state.familyAvatars[state.currentUser] || '';
      updateHeaderUserUI();
      // Prompt user to pick or confirm their specific identity
      showUserSelectionModal(true);
    }
  }

  function loadFamilyAvatars() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAMILY_AVATARS);
      if (stored) {
        state.familyAvatars = JSON.parse(stored) || {};
      } else {
        state.familyAvatars = {};
      }
    } catch (e) {
      state.familyAvatars = {};
    }
  }

  function getMemberAvatar(name) {
    if (!name) return '';
    if (state.familyAvatars && state.familyAvatars[name]) {
      return state.familyAvatars[name];
    }
    if (state.currentUser === name && state.currentUserAvatar) {
      return state.currentUserAvatar;
    }
    return '';
  }

  function saveMemberAvatar(name, avatarUrl) {
    if (!name) return;
    if (!state.familyAvatars) state.familyAvatars = {};

    if (avatarUrl) {
      state.familyAvatars[name] = avatarUrl;
    } else {
      delete state.familyAvatars[name];
    }

    try {
      localStorage.setItem(STORAGE_KEYS.FAMILY_AVATARS, JSON.stringify(state.familyAvatars));
    } catch (e) {
      console.warn('LocalStorage quota notice:', e);
    }

    if (state.currentUser === name) {
      state.currentUserAvatar = avatarUrl || '';
      if (avatarUrl) {
        localStorage.setItem(STORAGE_KEYS.USER_AVATAR_IMAGE, avatarUrl);
      } else {
        localStorage.removeItem(STORAGE_KEYS.USER_AVATAR_IMAGE);
      }
      updateHeaderUserUI();
    }

    // Broadcast avatar update to other open tabs
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({
          type: 'AVATARS_UPDATED',
          avatars: state.familyAvatars
        });
      } catch (e) {}
    }

    // Sync to Firestore for real-time cloud persistence across all family devices
    if (state.isFirebaseReady && state.firestore) {
      try {
        setDoc(doc(state.firestore, 'yahia_roster', 'avatars'), {
          avatars: state.familyAvatars,
          updatedAt: Date.now()
        }, { merge: true }).catch(console.warn);

        // Also save individual member doc
        const memberDocId = encodeURIComponent(name).replace(/%/g, '_');
        setDoc(doc(state.firestore, 'yahia_members', memberDocId), {
          name: name,
          avatar: avatarUrl || '',
          lastActive: Date.now()
        }, { merge: true }).catch(console.warn);
      } catch (err) {
        console.warn('Firestore avatar sync notice:', err);
      }
    }

    renderMemberPresetGrid();
    renderMessages();
  }

  function compressAndCropSquareImage(fileOrDataUrl, maxDim = 180, quality = 0.85) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = maxDim;
        canvas.height = maxDim;
        const ctx = canvas.getContext('2d');

        // Calculate center square crop
        const minSide = Math.min(img.width, img.height);
        const startX = (img.width - minSide) / 2;
        const startY = (img.height - minSide) / 2;

        ctx.drawImage(img, startX, startY, minSide, minSide, 0, 0, maxDim, maxDim);
        const dataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(dataUrl);
      };
      img.onerror = (err) => reject(err);

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else {
        const reader = new FileReader();
        reader.onload = (e) => { img.src = e.target.result; };
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(fileOrDataUrl);
      }
    });
  }

  function updateAvatarPreviewUI(avatarUrl, name) {
    const activeName = name || (DOM.customNameInput ? DOM.customNameInput.value : state.currentUser) || 'ي';
    if (avatarUrl) {
      DOM.userModalAvatarImg.src = avatarUrl;
      DOM.userModalAvatarImg.style.display = 'block';
      DOM.userModalAvatarInitial.style.display = 'none';
      DOM.userModalAvatarPreview.style.background = 'transparent';
      DOM.removeAvatarBtn.style.display = 'inline-flex';
    } else {
      DOM.userModalAvatarImg.src = '';
      DOM.userModalAvatarImg.style.display = 'none';
      DOM.userModalAvatarInitial.style.display = 'block';
      DOM.userModalAvatarInitial.textContent = getInitials(activeName);
      DOM.userModalAvatarPreview.style.background = getAvatarColor(activeName);
      DOM.removeAvatarBtn.style.display = 'none';
    }
  }

  function renderPresetAvatarsDrawer() {
    if (!DOM.presetAvatarsGrid) return;
    DOM.presetAvatarsGrid.innerHTML = '';

    PRESET_ILLUSTRATED_AVATARS.forEach(item => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'preset-avatar-btn';
      btn.title = item.label;
      btn.style.background = item.bg;
      btn.textContent = item.emoji;

      btn.addEventListener('click', async () => {
        DOM.presetAvatarsGrid.querySelectorAll('.preset-avatar-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');

        // Create high-res circular canvas badge for the emoji avatar
        const canvas = document.createElement('canvas');
        canvas.width = 180;
        canvas.height = 180;
        const ctx = canvas.getContext('2d');

        // Background Circle
        ctx.fillStyle = item.bg;
        ctx.beginPath();
        ctx.arc(90, 90, 90, 0, Math.PI * 2);
        ctx.fill();

        // Emoji
        ctx.font = '84px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.emoji, 90, 96);

        const dataUrl = canvas.toDataURL('image/png');
        state.tempSelectedAvatar = dataUrl;
        updateAvatarPreviewUI(dataUrl, DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
        if (DOM.presetAvatarsDrawer) DOM.presetAvatarsDrawer.style.display = 'none';
      });

      DOM.presetAvatarsGrid.appendChild(btn);
    });
  }

  // --------------------------------------------------------------------------
  // Camera Snapshot Engine
  // --------------------------------------------------------------------------
  async function openCameraSnapshotModal() {
    if (DOM.cameraSnapshotModal) {
      DOM.cameraSnapshotModal.style.display = 'flex';
      DOM.cameraBeforeCaptureControls.style.display = 'flex';
      DOM.cameraAfterCaptureControls.style.display = 'none';
      DOM.cameraCapturedImg.style.display = 'none';
      DOM.cameraVideo.style.display = 'block';
      if (DOM.cameraGuideRing) DOM.cameraGuideRing.style.display = 'block';
      if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'جاري تشغيل الكاميرا...';
      await startCameraStream();
    }
  }

  function closeCameraSnapshotModal() {
    stopCameraStream();
    if (DOM.cameraSnapshotModal) {
      DOM.cameraSnapshotModal.style.display = 'none';
    }
  }

  async function startCameraStream() {
    stopCameraStream();
    try {
      const constraints = {
        video: {
          facingMode: state.cameraFacingMode,
          width: { ideal: 640 },
          height: { ideal: 640 }
        },
        audio: false
      };

      state.cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
      if (DOM.cameraVideo) {
        DOM.cameraVideo.srcObject = state.cameraStream;
        DOM.cameraVideo.play().catch(e => console.warn('Video play notice:', e));
      }
      if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'الكاميرا جاهزة للالتقاط';
    } catch (err) {
      console.warn('Camera access issue:', err);
      if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'تعذر تشغيل الكاميرا المباشرة، يمكنك استخدام زر رفع صورة أو كاميرا الهاتف.';
      // Trigger mobile camera fallback input if direct stream is not allowed in iframe
      if (DOM.avatarCameraInput) {
        DOM.avatarCameraInput.click();
        closeCameraSnapshotModal();
      }
    }
  }

  function stopCameraStream() {
    if (state.cameraStream) {
      state.cameraStream.getTracks().forEach(track => track.stop());
      state.cameraStream = null;
    }
    if (DOM.cameraVideo) {
      DOM.cameraVideo.srcObject = null;
    }
  }

  async function snapPhoto() {
    if (!DOM.cameraVideo) return;

    // Trigger flash animation
    if (DOM.cameraFlashFx) {
      DOM.cameraFlashFx.classList.add('flash-active');
      setTimeout(() => DOM.cameraFlashFx.classList.remove('flash-active'), 200);
    }

    try {
      const video = DOM.cameraVideo;
      const vWidth = video.videoWidth || 480;
      const vHeight = video.videoHeight || 480;

      const canvas = DOM.cameraCanvas || document.createElement('canvas');
      const targetDim = 240;
      canvas.width = targetDim;
      canvas.height = targetDim;
      const ctx = canvas.getContext('2d');

      const minSide = Math.min(vWidth, vHeight);
      const startX = (vWidth - minSide) / 2;
      const startY = (vHeight - minSide) / 2;

      ctx.drawImage(video, startX, startY, minSide, minSide, 0, 0, targetDim, targetDim);
      const photoDataUrl = canvas.toDataURL('image/jpeg', 0.88);

      state.capturedPhotoData = photoDataUrl;
      DOM.cameraCapturedImg.src = photoDataUrl;
      DOM.cameraCapturedImg.style.display = 'block';
      DOM.cameraVideo.style.display = 'none';
      if (DOM.cameraGuideRing) DOM.cameraGuideRing.style.display = 'none';

      DOM.cameraBeforeCaptureControls.style.display = 'none';
      DOM.cameraAfterCaptureControls.style.display = 'flex';
      if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'تم التقاط الصورة، هل تريد اعتمادها؟';
    } catch (e) {
      console.warn('Snap photo error:', e);
    }
  }

  function retakePhoto() {
    state.capturedPhotoData = null;
    DOM.cameraCapturedImg.style.display = 'none';
    DOM.cameraVideo.style.display = 'block';
    if (DOM.cameraGuideRing) DOM.cameraGuideRing.style.display = 'block';
    DOM.cameraBeforeCaptureControls.style.display = 'flex';
    DOM.cameraAfterCaptureControls.style.display = 'none';
    if (DOM.cameraStatusLabel) DOM.cameraStatusLabel.textContent = 'الكاميرا جاهزة للالتقاط';
  }

  function useCapturedPhoto() {
    if (!state.capturedPhotoData) return;
    state.tempSelectedAvatar = state.capturedPhotoData;
    updateAvatarPreviewUI(state.capturedPhotoData, DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
    closeCameraSnapshotModal();
  }

  async function switchCameraFacing() {
    state.cameraFacingMode = state.cameraFacingMode === 'user' ? 'environment' : 'user';
    await startCameraStream();
  }

  function loadFamilyMembers() {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.FAMILY_MEMBERS);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.familyMembers = parsed.map(n => String(n).trim()).filter(Boolean);
        } else {
          state.familyMembers = [...DEFAULT_FAMILY_MEMBERS];
        }
      } else {
        state.familyMembers = [...DEFAULT_FAMILY_MEMBERS];
        localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(state.familyMembers));
      }
    } catch (e) {
      state.familyMembers = [...DEFAULT_FAMILY_MEMBERS];
    }
    updateFamilyCountUI();
    renderMemberPresetGrid();
  }

  function updateFamilyCountUI() {
    const count = state.familyMembers.length;
    if (DOM.settingsFamilyCount) {
      DOM.settingsFamilyCount.textContent = `${count} ${count === 1 ? 'فرد' : 'أفراد'}`;
    }
  }

  function renderMemberPresetGrid() {
    if (!DOM.memberPresetGrid) return;
    DOM.memberPresetGrid.innerHTML = '';

    if (!state.familyMembers || state.familyMembers.length === 0) {
      DOM.memberPresetGrid.innerHTML = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 12px; color: var(--text-muted); font-size: 0.82rem;">
          لا توجد أسماء مسجلة حالياً. اضغط "إدخال الكل دفعة واحدة" لإضافة أفراد العائلة.
        </div>
      `;
      return;
    }

    state.familyMembers.forEach(memberName => {
      const card = document.createElement('div');
      card.className = 'member-chip-card';
      if (state.currentUser && state.currentUser.trim() === memberName.trim()) {
        card.classList.add('active');
      }

      const avatar = document.createElement('div');
      avatar.className = 'member-chip-avatar';
      const memberPhoto = getMemberAvatar(memberName);
      if (memberPhoto) {
        avatar.innerHTML = `<img src="${memberPhoto}" alt="${escapeHTML(memberName)}">`;
        avatar.style.background = 'transparent';
      } else {
        avatar.style.background = getAvatarColor(memberName);
        avatar.textContent = getInitials(memberName);
      }

      const nameSpan = document.createElement('span');
      nameSpan.className = 'member-chip-name';
      nameSpan.textContent = memberName;
      nameSpan.title = memberName;

      card.appendChild(avatar);
      card.appendChild(nameSpan);

      // Single click: select name into custom input and load their avatar preview
      card.addEventListener('click', () => {
        DOM.memberPresetGrid.querySelectorAll('.member-chip-card').forEach(c => c.classList.remove('active'));
        card.classList.add('active');
        if (DOM.customNameInput) {
          DOM.customNameInput.value = memberName;
        }
        const memberAvatar = getMemberAvatar(memberName);
        state.tempSelectedAvatar = memberAvatar;
        updateAvatarPreviewUI(memberAvatar, memberName);
      });

      // Double click: directly save this user
      card.addEventListener('dblclick', () => {
        saveUserName(memberName);
      });

      DOM.memberPresetGrid.appendChild(card);
    });
  }

  function parseBulkNames(text) {
    if (!text) return [];
    const rawTokens = text.split(/[\n\r,،;]+/);
    const seen = new Set();
    const result = [];

    for (const raw of rawTokens) {
      const cleaned = raw.trim();
      if (cleaned && !seen.has(cleaned.toLowerCase())) {
        seen.add(cleaned.toLowerCase());
        result.push(cleaned);
      }
    }
    return result;
  }

  function updateBulkPreviewFromInput() {
    if (!DOM.bulkNamesTextarea) return;
    const names = parseBulkNames(DOM.bulkNamesTextarea.value);

    if (DOM.bulkDetectedCount) {
      DOM.bulkDetectedCount.textContent = names.length;
    }
    if (DOM.previewBadgesCount) {
      DOM.previewBadgesCount.textContent = names.length;
    }

    if (!DOM.bulkNamesPreviewGrid) return;
    DOM.bulkNamesPreviewGrid.innerHTML = '';

    if (names.length === 0) {
      DOM.bulkNamesPreviewGrid.innerHTML = `
        <span style="color: var(--text-dim); font-size: 0.8rem; padding: 6px 8px;">
          اكتب أو الصق الأسماء في المربع أعلاه لتظهر المعاينة هنا...
        </span>
      `;
      return;
    }

    names.forEach(name => {
      const badge = document.createElement('div');
      badge.className = 'bulk-preview-badge';

      const avatar = document.createElement('div');
      avatar.className = 'bulk-preview-avatar';
      avatar.style.background = getAvatarColor(name);
      avatar.textContent = getInitials(name);

      const label = document.createElement('span');
      label.textContent = name;

      badge.appendChild(avatar);
      badge.appendChild(label);
      DOM.bulkNamesPreviewGrid.appendChild(badge);
    });
  }

  function openBulkMembersModal() {
    hideUserSelectionModal();
    if (DOM.settingsModal) DOM.settingsModal.style.display = 'none';

    if (DOM.bulkMembersModal) {
      DOM.bulkMembersModal.style.display = 'flex';
      if (DOM.bulkNamesTextarea) {
        DOM.bulkNamesTextarea.value = state.familyMembers.join('\n');
        updateBulkPreviewFromInput();
        setTimeout(() => {
          DOM.bulkNamesTextarea.focus();
        }, 100);
      }
    }
  }

  function hideBulkMembersModal() {
    if (DOM.bulkMembersModal) {
      DOM.bulkMembersModal.style.display = 'none';
    }
  }

  function saveBulkNames() {
    if (!DOM.bulkNamesTextarea) return;
    const names = parseBulkNames(DOM.bulkNamesTextarea.value);

    if (names.length === 0) {
      alert('الرجاء كتابة أو لصق اسم واحد على الأقل من أفراد العائلة.');
      DOM.bulkNamesTextarea.focus();
      return;
    }

    state.familyMembers = names;
    localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(names));

    // Broadcast roster change to other open tabs
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({
          type: 'ROSTER_UPDATED',
          members: state.familyMembers
        });
      } catch (e) {}
    }

    // Sync to Firestore
    if (state.isFirebaseReady && state.firestore) {
      try {
        setDoc(doc(state.firestore, 'yahia_roster', 'members'), {
          list: state.familyMembers,
          updatedAt: Date.now()
        }, { merge: true }).catch(console.warn);
      } catch (err) {
        console.warn('Firestore roster sync error:', err);
      }
    }

    updateFamilyCountUI();
    renderMemberPresetGrid();
    hideBulkMembersModal();

    // Re-open user selection modal so they can choose their name from the new list
    showUserSelectionModal(true);
  }

  function loadSampleFamilyNames() {
    if (!DOM.bulkNamesTextarea) return;
    const sample = [
      'يحيي صبيح (الوالد)',
      'أم محمد (الوالدة)',
      'محمد يحيي صبيح',
      'أحمد يحيي صبيح',
      'محمود يحيي صبيح',
      'سارة يحيي صبيح',
      'فاطمة يحيي صبيح',
      'نور يحيي صبيح',
      'خالد يحيي صبيح'
    ].join('\n');

    DOM.bulkNamesTextarea.value = sample;
    updateBulkPreviewFromInput();
  }

  function updateHeaderUserUI() {
    if (!state.currentUser) return;
    DOM.headerUserName.textContent = state.currentUser;
    
    const avatarUrl = state.currentUserAvatar || getMemberAvatar(state.currentUser);
    if (avatarUrl) {
      DOM.headerUserAvatar.innerHTML = `<img src="${avatarUrl}" alt="${escapeHTML(state.currentUser)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
      DOM.headerUserAvatar.style.background = 'transparent';
    } else {
      DOM.headerUserAvatar.innerHTML = '';
      DOM.headerUserAvatar.textContent = getInitials(state.currentUser);
      DOM.headerUserAvatar.style.background = state.currentAvatarColor || getAvatarColor(state.currentUser);
    }

    if (DOM.settingsCurrentName) {
      DOM.settingsCurrentName.textContent = state.currentUser;
    }
  }

  function showUserSelectionModal(canClose = true) {
    DOM.userNameModal.style.display = 'flex';
    DOM.customNameInput.value = state.currentUser || '';
    DOM.closeUserModalBtn.style.display = canClose ? 'block' : 'none';
    
    // Set temporary selected avatar from current user or member avatar
    state.tempSelectedAvatar = state.currentUserAvatar || getMemberAvatar(state.currentUser) || '';
    updateAvatarPreviewUI(state.tempSelectedAvatar, state.currentUser);
    
    renderPresetAvatarsDrawer();
    renderMemberPresetGrid();
    
    setTimeout(() => {
      if (DOM.customNameInput) {
        DOM.customNameInput.focus();
        DOM.customNameInput.select();
      }
    }, 100);
  }

  function hideUserSelectionModal() {
    DOM.userNameModal.style.display = 'none';
    if (DOM.presetAvatarsDrawer) {
      DOM.presetAvatarsDrawer.style.display = 'none';
    }
  }

  function saveUserName(name) {
    const cleanName = (name || (DOM.customNameInput ? DOM.customNameInput.value : '')).trim();
    if (!cleanName) {
      alert('الرجاء اختيار اسم من القائمة أو كتابة اسمك الكريم للمتابعة.');
      if (DOM.customNameInput) DOM.customNameInput.focus();
      return;
    }

    state.currentUser = cleanName;
    state.currentAvatarColor = getAvatarColor(cleanName);

    localStorage.setItem(STORAGE_KEYS.USER_NAME, state.currentUser);
    localStorage.setItem(STORAGE_KEYS.USER_AVATAR_COLOR, state.currentAvatarColor);

    // Save customized avatar for this member
    saveMemberAvatar(cleanName, state.tempSelectedAvatar);

    // If new name not in family list, optionally add it
    if (!state.familyMembers.some(m => m.toLowerCase() === cleanName.toLowerCase())) {
      state.familyMembers.push(cleanName);
      localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(state.familyMembers));
      updateFamilyCountUI();

      // Broadcast roster change to other open tabs
      if (state.broadcastChannel) {
        try {
          state.broadcastChannel.postMessage({
            type: 'ROSTER_UPDATED',
            members: state.familyMembers
          });
        } catch (e) {}
      }

      // Sync to Firestore
      if (state.isFirebaseReady && state.firestore) {
        try {
          setDoc(doc(state.firestore, 'yahia_roster', 'members'), {
            list: state.familyMembers,
            updatedAt: Date.now()
          }, { merge: true }).catch(console.warn);
        } catch (err) {
          console.warn('Firestore roster sync error:', err);
        }
      }
    }

    renderMemberPresetGrid();
    updateHeaderUserUI();
    hideUserSelectionModal();
    renderMessages();

    // If the user had typed a message before picking their name, send it automatically!
    if ((DOM.messageInput.value && DOM.messageInput.value.trim()) || state.pendingAttachment) {
      sendMessage();
    }
  }

  function getInitials(name) {
    if (!name) return 'ص';
    const cleaned = name.replace(/👑|🌸|👨‍💼|👨‍💻|🎓|🧕|👩‍⚕️|⭐|🌟/g, '').trim();
    return cleaned.charAt(0) || 'ص';
  }

  function getAvatarColor(name) {
    if (!name) return AVATAR_COLORS[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    const index = Math.abs(hash) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  }

  // --------------------------------------------------------------------------
  // 4. Firebase Initialization & Real-Time Sync Logic
  // --------------------------------------------------------------------------
  const PROVISIONED_FIREBASE_CONFIG = {
    projectId: "phonic-keel-907pf",
    appId: "1:54804586561:web:c8e67ea130fa82a373a6c0",
    apiKey: "AIzaSyDNoDjkuRRPCnq9jpleqMu839qicpT3Ruw",
    authDomain: "phonic-keel-907pf.firebaseapp.com",
    firestoreDatabaseId: "ai-studio-bfd619db-ed15-49a7-9bd0-2231dfcba205",
    storageBucket: "phonic-keel-907pf.firebasestorage.app",
    messagingSenderId: "54804586561"
  };

  function initFirebase() {
    // 1. Always load cached messages first so the user sees their chat instantly
    loadCachedMessages();
    renderMessages();

    let userConfig = null;
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FB_CONFIG);
      if (saved) {
        userConfig = JSON.parse(saved);
      }
    } catch (e) {
      console.warn('Failed parsing saved firebase config:', e);
    }

    const config = (userConfig && userConfig.apiKey && !userConfig.apiKey.includes('DummyKey'))
      ? userConfig
      : PROVISIONED_FIREBASE_CONFIG;

    // Populate Settings modal inputs
    if (DOM.fbApiKey) DOM.fbApiKey.value = config.apiKey || '';
    if (DOM.fbDbUrl) DOM.fbDbUrl.value = config.databaseURL || '';
    if (DOM.fbStorageBucket) DOM.fbStorageBucket.value = config.storageBucket || '';
    if (DOM.fbProjectId) DOM.fbProjectId.value = config.projectId || '';

    // Initialize BroadcastChannel for instant multi-tab sync
    if (window.BroadcastChannel) {
      try {
        state.broadcastChannel = new BroadcastChannel('yahia_family_chat_channel');
        state.broadcastChannel.onmessage = (event) => {
          if (!event.data) return;
          if (event.data.type === 'NEW_MESSAGE') {
            handleIncomingMessage(event.data.message);
          } else if (event.data.type === 'DELETE_MESSAGE') {
            handleDeletedMessage(event.data.messageId);
          } else if (event.data.type === 'EVENTS_UPDATED') {
            state.familyEvents = Array.isArray(event.data.events) ? event.data.events : [];
            localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));
            updateEventsBadgeUI();
            if (DOM.eventsCalendarModal && DOM.eventsCalendarModal.style.display !== 'none') {
              renderFamilyEventsList();
            }
          } else if (event.data.type === 'ANNOUNCEMENT_UPDATED') {
            state.pinnedAnnouncement = event.data.announcement || null;
            renderPinnedBanner();
          } else if (event.data.type === 'MEMORIES_UPDATED') {
            state.familyMemories = Array.isArray(event.data.memories) ? event.data.memories : [];
            localStorage.setItem(STORAGE_KEYS.FAMILY_MEMORIES, JSON.stringify(state.familyMemories));
            updateMediaCounts();
            if (DOM.mediaGalleryModal && DOM.mediaGalleryModal.style.display !== 'none') {
              renderGalleryTab('albums');
            }
          } else if (event.data.type === 'AVATARS_UPDATED') {
            state.familyAvatars = event.data.avatars || {};
            localStorage.setItem(STORAGE_KEYS.FAMILY_AVATARS, JSON.stringify(state.familyAvatars));
            if (state.currentUser && state.familyAvatars[state.currentUser]) {
              state.currentUserAvatar = state.familyAvatars[state.currentUser];
              updateHeaderUserUI();
            }
            renderMemberPresetGrid();
            renderMessages();
          } else if (event.data.type === 'ROSTER_UPDATED') {
            state.familyMembers = Array.isArray(event.data.members) ? event.data.members : [];
            localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(state.familyMembers));
            updateFamilyCountUI();
            renderMemberPresetGrid();
          }
        };
      } catch (e) {
        console.warn('BroadcastChannel error:', e);
      }
    }

    // Initialize Firebase Firestore for live cloud synchronization across all devices
    try {
      let appInstance;
      if (!getApps().length) {
        appInstance = initializeApp(config);
      } else {
        appInstance = getApp();
      }

      const dbId = config.firestoreDatabaseId || "ai-studio-bfd619db-ed15-49a7-9bd0-2231dfcba205";
      state.firestore = getFirestore(appInstance, dbId);

      if (state.firestore) {
        state.isFirebaseReady = true;
        DOM.networkStatusBadge.classList.remove('offline');
        DOM.networkStatusText.textContent = 'متصل سحابياً (مباشر)';

        // Test connection with getDocFromServer
        getDocFromServer(doc(state.firestore, 'test', 'connection')).catch(() => {});

        // 1. Subscribe to Live Firestore Messages
        if (state.unsubscribeMessages) state.unsubscribeMessages();
        state.unsubscribeMessages = onSnapshot(collection(state.firestore, 'yahia_messages'), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const cloudMessages = [];
            snapshot.forEach((docSnap) => {
              cloudMessages.push({ id: docSnap.id, ...docSnap.data() });
            });
            cloudMessages.sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
            state.messages = cloudMessages;
            saveMessagesCache();
            renderMessages();
          } else if (snapshot && snapshot.empty && state.messages.length > 0) {
            // If cloud is empty, seed cached messages to cloud once
            state.messages.forEach(msg => {
              if (msg.id) {
                setDoc(doc(state.firestore, 'yahia_messages', msg.id), msg).catch(console.warn);
              }
            });
          }
        }, (err) => {
          console.warn('Firestore messages listener notice:', err.message);
        });

        // 2. Subscribe to Live Announcements
        if (state.unsubscribeAnnouncements) state.unsubscribeAnnouncements();
        state.unsubscribeAnnouncements = onSnapshot(doc(state.firestore, 'yahia_announcements', 'current_pinned'), (docSnap) => {
          if (docSnap.exists()) {
            state.pinnedAnnouncement = docSnap.data();
            localStorage.setItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT, JSON.stringify(docSnap.data()));
          } else {
            state.pinnedAnnouncement = null;
            localStorage.removeItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT);
          }
          renderPinnedBanner();
        }, (err) => {
          console.warn('Firestore announcements listener notice:', err.message);
        });

        // 3. Subscribe to Live Events
        if (state.unsubscribeEvents) state.unsubscribeEvents();
        state.unsubscribeEvents = onSnapshot(collection(state.firestore, 'yahia_events'), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const eventsList = [];
            snapshot.forEach(d => eventsList.push({ id: d.id, ...d.data() }));
            eventsList.sort((a, b) => new Date(a.date) - new Date(b.date));
            state.familyEvents = eventsList;
            localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(eventsList));
            updateEventsBadgeUI();
            if (DOM.eventsCalendarModal && DOM.eventsCalendarModal.style.display !== 'none') {
              renderFamilyEventsList();
            }
          }
        }, (err) => {
          console.warn('Firestore events listener notice:', err.message);
        });

        // 4. Subscribe to Live Memories Album
        if (state.unsubscribeMemories) state.unsubscribeMemories();
        state.unsubscribeMemories = onSnapshot(collection(state.firestore, 'yahia_memories'), (snapshot) => {
          if (snapshot && !snapshot.empty) {
            const memoriesList = [];
            snapshot.forEach(d => memoriesList.push({ id: d.id, ...d.data() }));
            memoriesList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
            state.familyMemories = memoriesList;
            localStorage.setItem(STORAGE_KEYS.FAMILY_MEMORIES, JSON.stringify(memoriesList));
            updateMediaCounts();
            if (DOM.mediaGalleryModal && DOM.mediaGalleryModal.style.display !== 'none') {
              renderGalleryTab('albums');
            }
          }
        }, (err) => {
          console.warn('Firestore memories listener notice:', err.message);
        });

        // 5. Subscribe to Live Family Members Roster
        if (state.unsubscribeRoster) state.unsubscribeRoster();
        state.unsubscribeRoster = onSnapshot(doc(state.firestore, 'yahia_roster', 'members'), (docSnap) => {
          if (docSnap.exists() && Array.isArray(docSnap.data().list) && docSnap.data().list.length > 0) {
            state.familyMembers = docSnap.data().list;
            localStorage.setItem(STORAGE_KEYS.FAMILY_MEMBERS, JSON.stringify(state.familyMembers));
            updateFamilyCountUI();
            renderMemberPresetGrid();
          } else if (!docSnap.exists() && state.familyMembers.length > 0) {
            setDoc(doc(state.firestore, 'yahia_roster', 'members'), {
              list: state.familyMembers,
              updatedAt: Date.now()
            }).catch(console.warn);
          }
        }, (err) => {
          console.warn('Firestore roster listener notice:', err.message);
        });

        // 6. Subscribe to Live Member Avatars & Personal Photos
        if (state.unsubscribeAvatars) state.unsubscribeAvatars();
        state.unsubscribeAvatars = onSnapshot(doc(state.firestore, 'yahia_roster', 'avatars'), (docSnap) => {
          if (docSnap.exists() && docSnap.data().avatars) {
            state.familyAvatars = { ...state.familyAvatars, ...docSnap.data().avatars };
            localStorage.setItem(STORAGE_KEYS.FAMILY_AVATARS, JSON.stringify(state.familyAvatars));
            if (state.currentUser && state.familyAvatars[state.currentUser]) {
              state.currentUserAvatar = state.familyAvatars[state.currentUser];
              localStorage.setItem(STORAGE_KEYS.USER_AVATAR_IMAGE, state.currentUserAvatar);
              updateHeaderUserUI();
            }
            renderMemberPresetGrid();
            renderMessages();
          } else if (!docSnap.exists() && Object.keys(state.familyAvatars).length > 0) {
            setDoc(doc(state.firestore, 'yahia_roster', 'avatars'), {
              avatars: state.familyAvatars,
              updatedAt: Date.now()
            }).catch(console.warn);
          }
        }, (err) => {
          console.warn('Firestore avatars listener notice:', err.message);
        });

        return;
      }
    } catch (err) {
      console.warn('Firebase Firestore setup notice:', err);
    }

    fallbackToLocalMode();
  }

  function fallbackToLocalMode() {
    state.isFirebaseReady = false;
    DOM.networkStatusBadge.classList.add('offline');
    DOM.networkStatusText.textContent = 'وضع التزامن العائلي المباشر';
  }

  function loadCachedMessages() {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.MESSAGES_CACHE);
      if (cached) {
        state.messages = JSON.parse(cached);
      } else {
        // Seed default initial family greetings
        const now = Date.now();
        state.messages = [
          {
            id: 'seed-1',
            sender: 'يحيي صبيح (الوالد)',
            text: 'السلام عليكم ورحمة الله وبركاته يا أبنائي وبناتي الكرام 🌹 أهلاً بكم جميعاً في مجلس عائلتنا المبارك.',
            timestamp: now - 3600000 * 2,
            reactions: { '❤️': 3, '🤲': 4 }
          },
          {
            id: 'seed-2',
            sender: 'أم محمد (الوالدة)',
            text: 'وعليكم السلام ورحمة الله وبركاته، ربي يحفظكم ويجمعنا دائماً على الخير والبركة والمحبة 🌸',
            timestamp: now - 3600000,
            reactions: { '❤️': 2, '🤲': 3 }
          }
        ];
        saveMessagesCache();
      }
    } catch (e) {
      state.messages = [];
    }
  }

  function saveMessagesCache() {
    try {
      localStorage.setItem(STORAGE_KEYS.MESSAGES_CACHE, JSON.stringify(state.messages));
    } catch (e) {}
  }

  function handleIncomingMessage(msg) {
    if (!state.messages.some(m => m.id === msg.id)) {
      state.messages.push(msg);
      state.messages.sort((a, b) => a.timestamp - b.timestamp);
      saveMessagesCache();
      renderMessages(msg.id);
      playNotificationSound();
    }
  }

  function handleDeletedMessage(msgId) {
    state.messages = state.messages.filter(m => m.id !== msgId);
    saveMessagesCache();
    renderMessages();
  }

  // --------------------------------------------------------------------------
  // 5. Message Dispatching & Instant Cloud Delivery
  // --------------------------------------------------------------------------
  function compressChatImage(fileOrDataUrl, maxDim = 1200, quality = 0.78) {
    return new Promise((resolve, reject) => {
      let objectUrl = null;
      const img = new Image();

      img.onload = () => {
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch (e) {}
        }
        let width = img.naturalWidth || img.width || 800;
        let height = img.naturalHeight || img.height || 600;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Convert to optimized JPEG Data URL (typically 80KB-160KB, well under Firestore's 1MB limit)
        const compressedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(compressedDataUrl);
      };

      img.onerror = (err) => {
        if (objectUrl) {
          try { URL.revokeObjectURL(objectUrl); } catch (e) {}
        }
        // Fallback: try FileReader if objectURL failed
        if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
          const reader = new FileReader();
          reader.onload = (e) => {
            const fallbackImg = new Image();
            fallbackImg.onload = () => {
              const canvas = document.createElement('canvas');
              let w = fallbackImg.naturalWidth || fallbackImg.width || 800;
              let h = fallbackImg.naturalHeight || fallbackImg.height || 600;
              if (w > maxDim || h > maxDim) {
                if (w > h) { h = Math.round((h * maxDim) / w); w = maxDim; }
                else { w = Math.round((w * maxDim) / h); h = maxDim; }
              }
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              ctx.drawImage(fallbackImg, 0, 0, w, h);
              resolve(canvas.toDataURL('image/jpeg', quality));
            };
            fallbackImg.onerror = () => reject(err);
            fallbackImg.src = e.target.result;
          };
          reader.onerror = () => reject(err);
          reader.readAsDataURL(fileOrDataUrl);
        } else {
          reject(err);
        }
      };

      if (typeof fileOrDataUrl === 'string') {
        img.src = fileOrDataUrl;
      } else if (fileOrDataUrl instanceof Blob || fileOrDataUrl instanceof File) {
        try {
          objectUrl = URL.createObjectURL(fileOrDataUrl);
          img.src = objectUrl;
        } catch (e) {
          const reader = new FileReader();
          reader.onload = (ev) => { img.src = ev.target.result; };
          reader.onerror = reject;
          reader.readAsDataURL(fileOrDataUrl);
        }
      } else {
        reject(new Error('Invalid image input format'));
      }
    });
  }

  async function sendMessage() {
    const text = (DOM.messageInput.value || '').trim();
    const attachment = state.pendingAttachment;

    if (!text && !attachment) return;

    if (!state.currentUser || !state.currentUser.trim()) {
      showUserSelectionModal(false);
      return;
    }

    // Generate unique message ID
    const msgId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);

    const messagePayload = {
      id: msgId,
      sender: state.currentUser,
      senderAvatar: state.currentUserAvatar || getMemberAvatar(state.currentUser) || '',
      text: text,
      timestamp: Date.now(),
      reactions: {},
      synced: false
    };

    // Extract YouTube video ID if present
    const youtubeId = extractYouTubeId(text);
    if (youtubeId) {
      messagePayload.youtubeId = youtubeId;
    }

    // Attach Quoted Reply Data (WhatsApp style)
    if (state.activeReplyTo) {
      messagePayload.replyTo = {
        id: state.activeReplyTo.id,
        sender: state.activeReplyTo.sender,
        text: state.activeReplyTo.text || '',
        mediaType: state.activeReplyTo.mediaType || ''
      };
    }

    // Handle Media Attachment
    if (attachment) {
      messagePayload.mediaUrl = attachment.dataUrl;
      messagePayload.mediaType = attachment.type;
      messagePayload.mediaName = attachment.name;
      messagePayload.mediaSize = attachment.size;
    }

    // 1. Optimistic Local Update - instant UI response
    state.messages.push(messagePayload);
    saveMessagesCache();

    // 2. Reset Form & UI immediately
    DOM.messageInput.value = '';
    DOM.messageInput.style.height = 'auto';
    clearPendingAttachment();
    cancelReplyTo();
    renderMessages(msgId);
    scrollToBottom(true);
    playNotificationSound();

    // 3. Broadcast to all other open tabs / windows
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({
          type: 'NEW_MESSAGE',
          message: messagePayload
        });
      } catch (e) {}
    }

    // 4. Trigger storage sync for cross-window reactivity
    try {
      localStorage.setItem(STORAGE_KEYS.SYNC_ACTION, JSON.stringify({
        type: 'NEW_MESSAGE',
        id: msgId,
        time: Date.now()
      }));
    } catch (e) {}

    // 5. Asynchronously sync to Firestore with delivery confirmation
    if (state.isFirebaseReady && state.firestore) {
      setDoc(doc(state.firestore, 'yahia_messages', msgId), messagePayload)
        .then(() => {
          const target = state.messages.find(m => m.id === msgId);
          if (target) {
            target.synced = true;
            saveMessagesCache();
            renderMessages();
          }
        })
        .catch(err => {
          console.error('[Firestore] Message sync error:', err);
          showToast(`⚠️ تعذر مزامنة المنشور: ${err.message || 'خطأ في الاتصال بالخادم'}`, 'error', 5000);
        });
    } else if (state.isFirebaseReady && state.dbRef) {
      try {
        const newRef = state.dbRef.push();
        newRef.set({ ...messagePayload, id: newRef.key, synced: true }).catch(err => {
          console.warn('Firebase async push note:', err.message);
        });
      } catch (err) {
        console.warn('Firebase sync dispatch error:', err);
      }
    }
  }

  // --------------------------------------------------------------------------
  // 6. Media Attachments & Voice Note Recorder
  // --------------------------------------------------------------------------
  async function handleFileSelect(file) {
    if (!file) return;

    const fileName = (file.name || '').toLowerCase();
    let type = 'file';

    // Comprehensive image check including mobile camera captures with empty or generic MIME types
    const isImage = (file.type && file.type.startsWith('image/')) ||
      /\.(jpe?g|png|webp|gif|bmp|heic|heif|svg)$/i.test(fileName) ||
      (!file.type && file.size > 0 && !/\.(mp4|webm|mov|mp3|wav|ogg|pdf|docx?|zip)$/i.test(fileName)) ||
      file.type === 'application/octet-stream';

    if (isImage && !file.type.startsWith('video/') && !file.type.startsWith('audio/')) {
      type = 'image';
    } else if (file.type.startsWith('video/') || /\.(mp4|webm|mov|m4v|3gp)$/i.test(fileName)) {
      type = 'video';
    } else if (file.type.startsWith('audio/') || /\.(mp3|wav|ogg|m4a|aac|webm)$/i.test(fileName)) {
      type = 'audio';
    }

    showUploadProgress(true, 'جاري معالجة وضغط الصورة...');
    updateUploadProgress(35);

    try {
      if (type === 'image') {
        updateUploadProgress(65);
        // Automatically compress mobile phone photos (which can be 5MB - 12MB) down to ~120KB
        const compressedDataUrl = await compressChatImage(file, 1200, 0.78);
        const approxSize = Math.round((compressedDataUrl.length * 3) / 4);
        state.pendingAttachment = {
          file: file,
          type: 'image',
          dataUrl: compressedDataUrl,
          name: file.name || 'صورة_كاميرا.jpg',
          size: approxSize
        };
        showToast('📸 تم التقاط الصورة! اضغط "إرسال الآن" أو أضف تعليقاً معها', 'info', 4000);
      } else {
        // Video / Audio / Other files
        const reader = new FileReader();
        await new Promise((resolve, reject) => {
          reader.onload = (e) => {
            const rawDataUrl = e.target.result;
            if (rawDataUrl.length > 950000) {
              showToast('تنبيه: حجم الملف كبير. يفضل مشاركة ملفات وسائط أصغر من 700 كيلوبايت أو روابط يوتيوب لضمان السرعة والمزامنة الفورية.', 'warning', 6000);
            }
            state.pendingAttachment = {
              file: file,
              type: type,
              dataUrl: rawDataUrl,
              name: file.name,
              size: file.size
            };
            resolve();
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      updateUploadProgress(100);
      setTimeout(() => showUploadProgress(false), 250);
      showAttachmentPreview();
    } catch (err) {
      console.warn('File processing notice:', err);
      showUploadProgress(false);
      showToast('حدث خطأ أثناء معالجة الملف، يرجى المحاولة مرة أخرى', 'error');
    }
  }

  function showAttachmentPreview() {
    const att = state.pendingAttachment;
    if (!att) return;

    DOM.attachmentPreviewBar.style.display = 'block';
    DOM.previewFilename.textContent = att.name || 'صورة الكاميرا';
    DOM.previewFilesize.textContent = att.type === 'image' ? `جاهزة للمشاركة 📸 (${formatBytes(att.size)})` : formatBytes(att.size);

    if (att.type === 'image') {
      DOM.previewThumbnail.innerHTML = `<img src="${att.dataUrl}" alt="preview">`;
    } else if (att.type === 'video') {
      DOM.previewThumbnail.innerHTML = `<i class="fa-solid fa-file-video"></i>`;
    } else if (att.type === 'audio') {
      DOM.previewThumbnail.innerHTML = `<i class="fa-solid fa-file-audio"></i>`;
    } else {
      DOM.previewThumbnail.innerHTML = `<i class="fa-solid fa-file-lines"></i>`;
    }
  }

  function clearPendingAttachment() {
    state.pendingAttachment = null;
    DOM.attachmentPreviewBar.style.display = 'none';
    DOM.fileInput.value = '';
    DOM.cameraInput.value = '';
  }

  function showUploadProgress(show, text = '') {
    DOM.uploadProgressBarContainer.style.display = show ? 'block' : 'none';
    if (text) DOM.uploadStatusText.textContent = text;
    DOM.uploadProgressBar.style.width = '0%';
    DOM.uploadPercentText.textContent = '0%';
  }

  function updateUploadProgress(percent) {
    DOM.uploadProgressBar.style.width = `${percent}%`;
    DOM.uploadPercentText.textContent = `${percent}%`;
  }

  // Audio Recording (Voice Notes)
  async function startAudioRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      state.audioChunks = [];
      state.mediaRecorder = new MediaRecorder(stream);

      state.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          state.audioChunks.push(event.data);
        }
      };

      state.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `تسجيل_صوتي_${Date.now()}.webm`, { type: 'audio/webm' });
        handleFileSelect(audioFile);
      };

      state.mediaRecorder.start();
      state.isRecording = true;
      state.recordStartTime = Date.now();

      // UI state
      DOM.audioRecordingBar.style.display = 'flex';
      DOM.messageForm.style.display = 'none';

      state.recordTimerInterval = setInterval(() => {
        const elapsedSec = Math.floor((Date.now() - state.recordStartTime) / 1000);
        const mins = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
        const secs = String(elapsedSec % 60).padStart(2, '0');
        DOM.recordingTimer.textContent = `${mins}:${secs}`;
      }, 500);

    } catch (err) {
      alert('تعذر الوصول إلى الميكروفون. يرجى التأكد من منح الإذن للمتصفح.');
      console.error(err);
    }
  }

  function stopAudioRecording(send = true) {
    if (!state.isRecording || !state.mediaRecorder) return;

    clearInterval(state.recordTimerInterval);
    state.isRecording = false;

    if (send) {
      state.mediaRecorder.onstop = () => {
        const audioBlob = new Blob(state.audioChunks, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], `تسجيل_صوتي_${Date.now()}.webm`, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = (e) => {
          state.pendingAttachment = {
            file: audioFile,
            type: 'audio',
            dataUrl: e.target.result,
            name: audioFile.name,
            size: audioFile.size
          };
          sendMessage();
        };
        reader.readAsDataURL(audioFile);
      };
      state.mediaRecorder.stop();
    } else {
      // Cancelled
      state.mediaRecorder.onstop = null;
      state.mediaRecorder.stop();
      state.pendingAttachment = null;
    }

    // Stop all audio tracks
    if (state.mediaRecorder.stream) {
      state.mediaRecorder.stream.getTracks().forEach(track => track.stop());
    }

    DOM.audioRecordingBar.style.display = 'none';
    DOM.messageForm.style.display = 'flex';
    DOM.recordingTimer.textContent = '00:00';
  }

  // --------------------------------------------------------------------------
  // 7. Message Deletion & Reactions
  // --------------------------------------------------------------------------
  function promptDeleteMessage(msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    state.selectedDeleteId = msgId;

    // Fill contextual info
    if (DOM.deleteMsgSender) {
      DOM.deleteMsgSender.textContent = msg.sender || 'عضو العائلة';
    }
    if (DOM.deleteMsgAvatar) {
      const avatarSrc = msg.senderAvatar || getMemberAvatar(msg.sender);
      if (avatarSrc) {
        DOM.deleteMsgAvatar.innerHTML = `<img src="${avatarSrc}" alt="${escapeHTML(msg.sender || 'ع')}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
        DOM.deleteMsgAvatar.style.background = 'transparent';
      } else {
        DOM.deleteMsgAvatar.innerHTML = '';
        DOM.deleteMsgAvatar.textContent = getInitials(msg.sender || 'ع');
        DOM.deleteMsgAvatar.style.background = getAvatarColor(msg.sender || '');
      }
    }
    if (DOM.deleteMsgTime) {
      const msgDate = new Date(msg.timestamp);
      DOM.deleteMsgTime.textContent = `${formatDateHeader(msgDate)}، ${formatArabicTime(msgDate)}`;
    }

    // Fill message preview snippet
    if (DOM.deleteMessagePreview) {
      if (msg.text && msg.mediaUrl) {
        DOM.deleteMessagePreview.innerHTML = `
          <div>${escapeHTML(msg.text)}</div>
          <div style="margin-top: 6px; color: var(--accent-secondary); font-size: 0.8rem;">
            <i class="fa-solid fa-paperclip"></i> مرفق: <strong>${escapeHTML(msg.mediaName || 'ملف وسائط')}</strong>
          </div>
        `;
      } else if (msg.text) {
        DOM.deleteMessagePreview.innerHTML = `<div>${escapeHTML(msg.text)}</div>`;
      } else if (msg.mediaUrl) {
        DOM.deleteMessagePreview.innerHTML = `
          <div style="color: var(--accent-secondary); font-size: 0.85rem;">
            <i class="fa-solid fa-paperclip"></i> مرفق: <strong>${escapeHTML(msg.mediaName || 'ملف وسائط')}</strong>
          </div>
        `;
      } else {
        DOM.deleteMessagePreview.textContent = 'رسالة في شات العائلة';
      }
    }

    // Reset safety checkbox and delete button state
    if (DOM.deleteSafetyCheck) {
      DOM.deleteSafetyCheck.checked = false;
    }
    if (DOM.confirmDeleteBtn) {
      DOM.confirmDeleteBtn.disabled = true;
    }

    DOM.deleteModal.style.display = 'flex';
  }

  async function confirmDeleteMessage() {
    const msgId = state.selectedDeleteId;
    if (!msgId) return;

    if (DOM.deleteSafetyCheck && !DOM.deleteSafetyCheck.checked) {
      alert('يرجى تحديد خيار تأكيد الأمان للمتابعة مع حذف الرسالة.');
      return;
    }

    if (state.isFirebaseReady && state.firestore) {
      try {
        deleteDoc(doc(state.firestore, 'yahia_messages', msgId)).catch(e => console.warn('Firestore delete notice:', e));
      } catch (e) {
        console.warn('Delete fallback:', e);
      }
    } else if (state.isFirebaseReady && state.dbRef) {
      try {
        await state.dbRef.child(msgId).remove();
      } catch (e) {
        console.warn('Delete fallback:', e);
      }
    }

    handleDeletedMessage(msgId);

    if (state.broadcastChannel) {
      state.broadcastChannel.postMessage({
        type: 'DELETE_MESSAGE',
        messageId: msgId
      });
    }

    DOM.deleteModal.style.display = 'none';
    state.selectedDeleteId = null;
  }

  // --------------------------------------------------------------------------
  // Quoted Reply System (WhatsApp Style)
  // --------------------------------------------------------------------------
  function setReplyTo(msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    let previewText = msg.text || '';
    if (!previewText) {
      if (msg.mediaType === 'image') previewText = '📷 صورة';
      else if (msg.mediaType === 'video') previewText = '🎥 مقطع فيديو';
      else if (msg.mediaType === 'audio') previewText = '🎤 تسجيل صوتي';
      else if (msg.type === 'poll' || msg.pollData) previewText = '📊 استطلاع رأي عائلي';
      else previewText = 'مرفق';
    }

    state.activeReplyTo = {
      id: msg.id,
      sender: msg.sender,
      text: previewText,
      mediaType: msg.mediaType || ''
    };

    if (DOM.replyPreviewBar && DOM.replyToName && DOM.replyToText) {
      DOM.replyToName.textContent = msg.sender;
      DOM.replyToText.textContent = previewText;
      DOM.replyPreviewBar.style.display = 'flex';
    }

    if (DOM.messageInput) {
      DOM.messageInput.focus();
    }
  }

  function cancelReplyTo() {
    state.activeReplyTo = null;
    if (DOM.replyPreviewBar) {
      DOM.replyPreviewBar.style.display = 'none';
    }
  }

  function scrollToMessage(msgId) {
    if (!msgId) return;

    const targetMsg = state.messages.find(m => m.id === msgId);
    if (targetMsg && state.selectedDateFilter) {
      const msgDateStr = toISODateString(new Date(targetMsg.timestamp));
      if (msgDateStr !== state.selectedDateFilter) {
        filterByDate(msgDateStr);
        showToast(`تم الانتقال لتاريخ الرسالة الأصلية (${formatDateHeader(new Date(targetMsg.timestamp))}) 📅`, 'info', 2500);
      }
    }

    setTimeout(() => {
      const rowEl = document.querySelector(`.message-row[data-id="${msgId}"]`);
      if (rowEl) {
        rowEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        rowEl.classList.remove('highlight-quoted-message');
        void rowEl.offsetWidth;
        rowEl.classList.add('highlight-quoted-message');
        setTimeout(() => {
          rowEl.classList.remove('highlight-quoted-message');
        }, 2200);
      } else {
        showToast('الرسالة المقتبسة غير موجودة أو تم حذفها', 'warning');
      }
    }, 120);
  }

  // --------------------------------------------------------------------------
  // WhatsApp Emoji Reactions & Floating Dock
  // --------------------------------------------------------------------------
  function toggleReaction(msgId, emoji) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg) return;

    if (!msg.reactions) msg.reactions = {};

    const currentUser = (state.currentUser || 'أنا').trim();
    const rawVal = msg.reactions[emoji];

    if (Array.isArray(rawVal)) {
      const idx = rawVal.indexOf(currentUser);
      if (idx >= 0) {
        rawVal.splice(idx, 1);
        if (rawVal.length === 0) {
          delete msg.reactions[emoji];
        }
      } else {
        rawVal.push(currentUser);
      }
    } else if (typeof rawVal === 'number') {
      if (rawVal > 0) {
        msg.reactions[emoji] = [currentUser];
      } else {
        msg.reactions[emoji] = [currentUser];
      }
    } else {
      msg.reactions[emoji] = [currentUser];
    }

    // Real-time synchronization with Firestore / Firebase
    if (state.isFirebaseReady && state.firestore) {
      updateDoc(doc(state.firestore, 'yahia_messages', msgId), {
        reactions: msg.reactions
      }).catch(console.warn);
    } else if (state.isFirebaseReady && state.dbRef) {
      state.dbRef.child(msgId).child('reactions').set(msg.reactions);
    }

    // Cross-tab broadcast
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({
          type: 'TOGGLE_REACTION',
          messageId: msgId,
          reactions: msg.reactions
        });
      } catch (e) {}
    }

    saveMessagesCache();
    renderMessages();
  }

  function toggleReactionDock(msgId, containerEl) {
    const existingDock = document.getElementById('activeReactionDock');
    if (existingDock) {
      const prevMsgId = existingDock.getAttribute('data-msg-id');
      existingDock.remove();
      if (prevMsgId === msgId) {
        return;
      }
    }

    const dock = document.createElement('div');
    dock.id = 'activeReactionDock';
    dock.className = 'reaction-dock-popover';
    dock.setAttribute('data-msg-id', msgId);

    const whatsappEmojis = ['❤️', '👍', '😂', '😮', '😢', '🤲', '🌹', '👏', '🎉', '🎂'];
    whatsappEmojis.forEach(emoji => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'reaction-dock-emoji';
      btn.textContent = emoji;
      btn.title = emoji;
      btn.onclick = (e) => {
        e.stopPropagation();
        toggleReaction(msgId, emoji);
        dock.remove();
      };
      dock.appendChild(btn);
    });

    containerEl.appendChild(dock);
  }

  // --------------------------------------------------------------------------
  // Date Filtering & Memory Navigation System
  // --------------------------------------------------------------------------
  function toISODateString(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  function getAllUniqueDatesWithMessages() {
    const dateMap = new Map();
    state.messages.forEach(msg => {
      if (!msg.timestamp) return;
      const d = new Date(msg.timestamp);
      const iso = toISODateString(d);
      if (!dateMap.has(iso)) {
        dateMap.set(iso, {
          iso,
          date: d,
          formattedDate: formatDateHeader(d),
          count: 0,
          senders: new Set()
        });
      }
      const entry = dateMap.get(iso);
      entry.count++;
      if (msg.sender) entry.senders.add(msg.sender);
    });

    return Array.from(dateMap.values()).sort((a, b) => b.date.getTime() - a.date.getTime());
  }

  function filterByDate(dateIsoStr) {
    if (!dateIsoStr || dateIsoStr === 'all') {
      state.selectedDateFilter = null;
      if (DOM.dateFilterBanner) DOM.dateFilterBanner.style.display = 'none';
      if (DOM.dateFilterBadgeDot) DOM.dateFilterBadgeDot.style.display = 'none';
      renderMessages();
      scrollToBottom(false);
      return;
    }

    state.selectedDateFilter = dateIsoStr;

    const parts = dateIsoStr.split('-');
    const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
    const formatted = formatDateHeader(d);
    const count = state.messages.filter(m => toISODateString(new Date(m.timestamp)) === dateIsoStr).length;

    if (DOM.activeFilteredDateText) DOM.activeFilteredDateText.textContent = formatted;
    if (DOM.activeFilteredDateCount) DOM.activeFilteredDateCount.textContent = `${count} رسائل`;
    if (DOM.dateFilterBanner) DOM.dateFilterBanner.style.display = 'flex';
    if (DOM.dateFilterBadgeDot) DOM.dateFilterBadgeDot.style.display = 'block';

    renderMessages();
    scrollToTop(false);
  }

  function navigateDayFilter(direction) {
    const available = getAllUniqueDatesWithMessages();
    if (available.length === 0) {
      showToast('لا توجد رسائل مسجلة في المحادثة بعد', 'info');
      return;
    }

    let currentIdx = available.findIndex(item => item.iso === state.selectedDateFilter);
    if (currentIdx === -1) {
      currentIdx = 0;
    }

    const nextIdx = direction === 'prev' ? currentIdx + 1 : currentIdx - 1;

    if (nextIdx >= 0 && nextIdx < available.length) {
      filterByDate(available[nextIdx].iso);
    } else {
      showToast(direction === 'prev' ? 'وصلت إلى أقدم يوم مسجل في المحادثة 📜' : 'وصلت إلى أحدث يوم مسجل في المحادثة 🌟', 'info');
    }
  }

  function openDateFilterModal() {
    if (!DOM.dateFilterModal) return;
    renderAvailableDatesList();
    if (DOM.dateFilterInput) {
      DOM.dateFilterInput.value = state.selectedDateFilter || toISODateString(new Date());
    }
    DOM.dateFilterModal.style.display = 'flex';
  }

  function renderAvailableDatesList() {
    if (!DOM.availableDatesList) return;
    const available = getAllUniqueDatesWithMessages();
    DOM.availableDatesList.innerHTML = '';

    if (available.length === 0) {
      DOM.availableDatesList.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:18px;font-size:0.88rem;">لا توجد رسائل مسجلة بعد في المحادثة</div>`;
      return;
    }

    available.forEach(item => {
      const el = document.createElement('div');
      el.className = `date-memory-item ${state.selectedDateFilter === item.iso ? 'active-filter' : ''}`;
      const sendersList = Array.from(item.senders).slice(0, 3).join('، ') + (item.senders.size > 3 ? '...' : '');

      el.innerHTML = `
        <div class="memory-item-info">
          <div class="memory-item-date"><i class="fa-regular fa-calendar text-accent"></i> ${item.formattedDate}</div>
          <div class="memory-item-sub"><i class="fa-solid fa-users"></i> ${sendersList || 'محادثات العائلة'}</div>
        </div>
        <span class="memory-item-badge">${item.count} رسالة</span>
      `;

      el.onclick = () => {
        filterByDate(item.iso);
        DOM.dateFilterModal.style.display = 'none';
        showToast(`تم عرض ذكريات ${item.formattedDate} 📅`, 'success');
      };

      DOM.availableDatesList.appendChild(el);
    });
  }

  // --------------------------------------------------------------------------
  // 8. Message Stream Rendering & Date Grouping
  // --------------------------------------------------------------------------
  function renderMessages(newMsgId = null) {
    let filteredMessages = state.messages;

    // Filter by Selected Memory Date if active
    if (state.selectedDateFilter) {
      filteredMessages = filteredMessages.filter(m => {
        if (!m.timestamp) return false;
        return toISODateString(new Date(m.timestamp)) === state.selectedDateFilter;
      });
    }

    // Filter by Search Query if active
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      filteredMessages = filteredMessages.filter(m => 
        (m.text && m.text.toLowerCase().includes(q)) ||
        (m.sender && m.sender.toLowerCase().includes(q)) ||
        (m.mediaName && m.mediaName.toLowerCase().includes(q))
      );
      if (DOM.searchResultsCount) {
        DOM.searchResultsCount.textContent = `تم العثور على ${filteredMessages.length} رسالة مطابقة`;
      }
    }

    DOM.messagesStream.innerHTML = '';

    if (filteredMessages.length === 0) {
      if (state.selectedDateFilter) {
        DOM.familyWelcomeCard.style.display = 'none';
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'empty-memory-filter-card';
        emptyDiv.innerHTML = `
          <div class="empty-memory-icon"><i class="fa-regular fa-calendar-xmark"></i></div>
          <h3>لا توجد رسائل مسجلة في هذا اليوم</h3>
          <p>لم يتم العثور على رسائل في تاريخ <strong>${DOM.activeFilteredDateText ? DOM.activeFilteredDateText.textContent : state.selectedDateFilter}</strong>.</p>
          <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
            <button type="button" class="btn btn-outline btn-sm" id="emptyMemoryOpenModalBtn"><i class="fa-solid fa-calendar-days"></i> اختيار يوم آخر</button>
            <button type="button" class="btn btn-primary btn-sm" id="emptyMemoryClearBtn"><i class="fa-solid fa-rotate-left"></i> عرض جميع الرسائل</button>
          </div>
        `;
        emptyDiv.querySelector('#emptyMemoryClearBtn').onclick = () => filterByDate('all');
        emptyDiv.querySelector('#emptyMemoryOpenModalBtn').onclick = openDateFilterModal;
        DOM.messagesStream.appendChild(emptyDiv);
        return;
      }

      DOM.familyWelcomeCard.style.display = 'block';
      return;
    }

    DOM.familyWelcomeCard.style.display = 'none';

    let lastDateString = '';

    filteredMessages.forEach(msg => {
      const msgDate = new Date(msg.timestamp);
      const dateKey = formatDateHeader(msgDate);

      // Render Date Divider if new day
      if (dateKey !== lastDateString) {
        lastDateString = dateKey;
        const divider = document.createElement('div');
        divider.className = 'date-divider';
        divider.innerHTML = `<span class="date-divider-pill">${dateKey}</span>`;
        DOM.messagesStream.appendChild(divider);
      }

      // Create Message Row
      const isOutgoing = msg.sender === state.currentUser;
      const row = document.createElement('div');
      row.className = `message-row ${isOutgoing ? 'outgoing' : 'incoming'}`;
      if (newMsgId && msg.id === newMsgId) {
        row.classList.add('new-arrival');
      }
      row.setAttribute('data-id', msg.id);

      // Sender Avatar
      const avatarEl = document.createElement('div');
      avatarEl.className = 'sender-avatar';
      const senderAvatarSrc = msg.senderAvatar || getMemberAvatar(msg.sender);
      if (senderAvatarSrc) {
        avatarEl.innerHTML = `<img src="${senderAvatarSrc}" alt="${escapeHTML(msg.sender)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;display:block;">`;
        avatarEl.style.background = 'transparent';
      } else {
        avatarEl.textContent = getInitials(msg.sender);
        avatarEl.style.background = isOutgoing 
          ? 'var(--accent-gradient)' 
          : getAvatarColor(msg.sender);
      }

      // Bubble Box Container
      const bubbleBox = document.createElement('div');
      bubbleBox.className = 'message-bubble-box';

      // Floating Action Toolbar (WhatsApp Quick Actions: Reply, React, Delete)
      const actionsToolbar = document.createElement('div');
      actionsToolbar.className = 'message-actions-toolbar';

      // React Button
      const reactBtn = document.createElement('button');
      reactBtn.type = 'button';
      reactBtn.className = 'msg-action-btn react-btn';
      reactBtn.title = 'تفاعل بإيموجي (واتساب)';
      reactBtn.innerHTML = `<i class="fa-regular fa-face-smile"></i>`;
      reactBtn.onclick = (e) => {
        e.stopPropagation();
        toggleReactionDock(msg.id, bubbleBox);
      };
      actionsToolbar.appendChild(reactBtn);

      // Reply Button
      const replyBtn = document.createElement('button');
      replyBtn.type = 'button';
      replyBtn.className = 'msg-action-btn reply-btn';
      replyBtn.title = 'رد على هذه الرسالة (اقتباس)';
      replyBtn.innerHTML = `<i class="fa-solid fa-reply"></i>`;
      replyBtn.onclick = (e) => {
        e.stopPropagation();
        setReplyTo(msg.id);
      };
      actionsToolbar.appendChild(replyBtn);

      // Delete Button
      const delActionBtn = document.createElement('button');
      delActionBtn.type = 'button';
      delActionBtn.className = 'msg-action-btn';
      delActionBtn.title = 'حذف الرسالة';
      delActionBtn.innerHTML = `<i class="fa-regular fa-trash-can"></i>`;
      delActionBtn.onclick = (e) => {
        e.stopPropagation();
        promptDeleteMessage(msg.id);
      };
      actionsToolbar.appendChild(delActionBtn);

      bubbleBox.appendChild(actionsToolbar);

      const bubble = document.createElement('div');
      bubble.className = 'message-bubble';

      // Sender Name Tag
      const senderNameEl = document.createElement('div');
      senderNameEl.className = 'message-sender-name';
      senderNameEl.innerHTML = `<span>${escapeHTML(msg.sender)}</span>`;
      bubble.appendChild(senderNameEl);

      // Render Quoted Reply Card if message is a reply
      if (msg.replyTo) {
        const quoteWrap = document.createElement('div');
        quoteWrap.className = 'message-quoted-preview';
        quoteWrap.title = 'انقر للانتقال للرسالة الأصلية';
        quoteWrap.innerHTML = `
          <div class="quote-bar"></div>
          <div class="quote-content">
            <div class="quote-sender"><i class="fa-solid fa-reply"></i> ${escapeHTML(msg.replyTo.sender || '')}</div>
            <div class="quote-snippet">${escapeHTML(msg.replyTo.text || 'رسالة')}</div>
          </div>
        `;
        quoteWrap.onclick = (e) => {
          e.stopPropagation();
          scrollToMessage(msg.replyTo.id);
        };
        bubble.appendChild(quoteWrap);
      }

      // Polls or Special Message Types
      if (msg.type === 'poll' || msg.pollData) {
        const pollContainer = createPollMessageElement(msg);
        bubble.appendChild(pollContainer);
      }

      // Media Rendering
      if (msg.mediaUrl) {
        if (msg.mediaType === 'image') {
          const imgWrap = document.createElement('div');
          imgWrap.className = 'chat-media-image';
          imgWrap.innerHTML = `<img src="${msg.mediaUrl}" alt="${escapeHTML(msg.mediaName || 'صورة')}" loading="lazy">`;
          imgWrap.onclick = () => {
            const allImages = state.messages
              .filter(m => m.mediaType === 'image' && m.mediaUrl)
              .map(m => ({ url: m.mediaUrl, sender: m.sender, time: formatArabicTime(new Date(m.timestamp)) }));
            const curIdx = allImages.findIndex(img => img.url === msg.mediaUrl);
            openLightbox(msg.mediaUrl, msg.sender, formatArabicTime(msgDate), allImages, curIdx >= 0 ? curIdx : 0);
          };
          bubble.appendChild(imgWrap);
        } else if (msg.mediaType === 'video') {
          const vidWrap = document.createElement('div');
          vidWrap.className = 'chat-media-video';
          vidWrap.innerHTML = `<video controls playsinline src="${msg.mediaUrl}"></video>`;
          bubble.appendChild(vidWrap);
        } else if (msg.mediaType === 'audio') {
          const audWaveWrap = createWaveformPlayerElement(msg);
          bubble.appendChild(audWaveWrap);
        }
      }

      // YouTube Video Embed
      if (msg.youtubeId) {
        const ytWrap = document.createElement('div');
        ytWrap.className = 'youtube-embed-wrapper';
        ytWrap.innerHTML = `
          <div class="video-aspect">
            <iframe 
              src="https://www.youtube.com/embed/${msg.youtubeId}" 
              title="YouTube video player" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
              allowfullscreen>
            </iframe>
          </div>
        `;
        bubble.appendChild(ytWrap);
      }

      // Text Message Body
      if (msg.text) {
        const textEl = document.createElement('div');
        textEl.className = 'message-text';
        textEl.innerHTML = formatMessageText(msg.text);
        bubble.appendChild(textEl);
      }

      // Footer Meta (Time + Status)
      const footerMeta = document.createElement('div');
      footerMeta.className = 'message-footer-meta';
      
      const timeSpan = document.createElement('span');
      timeSpan.className = 'message-time';
      timeSpan.textContent = formatArabicTime(msgDate);
      footerMeta.appendChild(timeSpan);

      if (isOutgoing) {
        const checkSpan = document.createElement('span');
        checkSpan.className = 'message-status-check';
        checkSpan.innerHTML = `<i class="fa-solid fa-check-double" style="color: #38bdf8;"></i>`;
        footerMeta.appendChild(checkSpan);
      }

      bubble.appendChild(footerMeta);
      bubbleBox.appendChild(bubble);

      // WhatsApp Reaction Pills Display
      if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        const reactionsBar = document.createElement('div');
        reactionsBar.className = 'bubble-reactions-bar';
        for (const [emoji, val] of Object.entries(msg.reactions)) {
          let count = 0;
          let namesList = [];
          let hasUserReacted = false;

          if (Array.isArray(val)) {
            count = val.length;
            namesList = val;
            hasUserReacted = val.includes(state.currentUser);
          } else if (typeof val === 'number') {
            count = val;
          }

          if (count > 0) {
            const rPill = document.createElement('span');
            rPill.className = `reaction-pill ${hasUserReacted ? 'user-reacted' : ''}`;
            const tooltip = namesList.length > 0 ? `تفاعل بواسطة: ${namesList.join('، ')}` : `${count} تفاعل`;
            rPill.title = tooltip;
            rPill.innerHTML = `${emoji} <strong>${count}</strong>`;
            rPill.onclick = (e) => {
              e.stopPropagation();
              toggleReaction(msg.id, emoji);
            };
            reactionsBar.appendChild(rPill);
          }
        }
        if (reactionsBar.children.length > 0) {
          bubbleBox.appendChild(reactionsBar);
        }
      }

      row.appendChild(avatarEl);
      row.appendChild(bubbleBox);
      DOM.messagesStream.appendChild(row);
    });

    updateMediaCounts();
    setTimeout(updateScrollNavUI, 50);
  }

  // --------------------------------------------------------------------------
  // 9. Formatters & Helpers (Arabic Date, YouTube Regex, Lightbox)
  // --------------------------------------------------------------------------
  function extractYouTubeId(url) {
    if (!url) return null;
    const regExp = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/i;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  function formatMessageText(text) {
    if (!text) return '';
    let escaped = escapeHTML(text);

    // Convert generic URLs into clickable links (excluding pure YouTube embeds)
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    escaped = escaped.replace(urlRegex, (url) => {
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="chat-link-card"><i class="fa-solid fa-arrow-up-right-from-square"></i> <span>${url}</span></a>`;
    });

    return escaped;
  }

  function escapeHTML(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function formatDateHeader(date) {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(date, today)) return 'اليوم';
    if (isSameDay(date, yesterday)) return 'أمس';

    const days = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

    const dayName = days[date.getDay()];
    const dayNum = date.getDate();
    const monthName = months[date.getMonth()];
    const year = date.getFullYear();

    return `${dayName}، ${dayNum} ${monthName} ${year}`;
  }

  function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  }

  function formatArabicTime(date) {
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'م' : 'ص';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${period}`;
  }

  function formatBytes(bytes, decimals = 1) {
    if (!bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  function scrollToBottom(smooth = true) {
    if (!DOM.chatMain) return;
    const target = DOM.chatMain.scrollHeight;
    try {
      DOM.chatMain.scrollTo({
        top: target,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } catch (e) {
      DOM.chatMain.scrollTop = target;
    }
    setTimeout(() => {
      if (DOM.chatMain) {
        updateScrollNavUI();
      }
    }, smooth ? 250 : 20);
  }

  function scrollToTop(smooth = true) {
    if (!DOM.chatMain) return;
    try {
      DOM.chatMain.scrollTo({
        top: 0,
        behavior: smooth ? 'smooth' : 'auto'
      });
    } catch (e) {
      DOM.chatMain.scrollTop = 0;
    }
    setTimeout(() => {
      if (DOM.chatMain) {
        updateScrollNavUI();
      }
    }, smooth ? 250 : 20);
  }

  function scrollStep(delta = 280) {
    if (!DOM.chatMain) return;
    try {
      DOM.chatMain.scrollBy({
        top: delta,
        behavior: 'smooth'
      });
    } catch (e) {
      DOM.chatMain.scrollTop += delta;
    }
    setTimeout(updateScrollNavUI, 200);
  }

  function updateScrollNavUI() {
    if (!DOM.chatMain || !DOM.chatNavControls) return;
    const scrollTop = DOM.chatMain.scrollTop;
    const scrollHeight = DOM.chatMain.scrollHeight;
    const clientHeight = DOM.chatMain.clientHeight;
    
    const isAtTop = scrollTop <= 20;
    const isAtBottom = scrollHeight - scrollTop - clientHeight <= 30;

    // Adjust button styles / active states without blocking clicks
    if (DOM.scrollToTopBtn) {
      DOM.scrollToTopBtn.style.opacity = isAtTop ? '0.5' : '1';
    }
    if (DOM.scrollToBottomBtn) {
      DOM.scrollToBottomBtn.style.opacity = isAtBottom ? '0.5' : '1';
      // Hide unread count if reached bottom
      if (isAtBottom && DOM.unreadCountBadge) {
        DOM.unreadCountBadge.style.display = 'none';
      }
    }
  }

  function playNotificationSound() {
    if (!state.soundEnabled) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (e) {}
  }

  // --------------------------------------------------------------------------
  // 10. Interactive Audio Waveform Player
  // --------------------------------------------------------------------------
  function createWaveformPlayerElement(msg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-audio-waveform-player';
    wrapper.setAttribute('data-msg-id', msg.id);

    const audio = new Audio(msg.mediaUrl);
    audio.preload = 'metadata';

    const playBtn = document.createElement('button');
    playBtn.className = 'waveform-play-btn';
    playBtn.setAttribute('type', 'button');
    playBtn.title = 'تشغيل / إيقاف التسجيل الصوتي';
    playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;

    const mainTrack = document.createElement('div');
    mainTrack.className = 'waveform-main-track';

    const headerLine = document.createElement('div');
    headerLine.className = 'waveform-header-line';
    headerLine.innerHTML = `
      <span class="waveform-voice-badge"><i class="fa-solid fa-microphone-lines"></i> رسالة صوتية عائلية</span>
      <span class="waveform-time-label">00:00</span>
    `;
    const timeLabel = headerLine.querySelector('.waveform-time-label');

    // Create Waveform Visualizer Bars
    const barsContainer = document.createElement('div');
    barsContainer.className = 'waveform-bars-container';
    const totalBars = 28;
    const barElements = [];

    // Pseudo-random deterministic heights for bars
    let seed = 0;
    for (let i = 0; i < (msg.id || '').length; i++) {
      seed = (seed + msg.id.charCodeAt(i)) % 100;
    }

    for (let i = 0; i < totalBars; i++) {
      const bar = document.createElement('div');
      bar.className = 'waveform-bar';
      // Harmonic wave pattern + pseudo noise
      const heightPercent = 20 + Math.abs(Math.sin((i + seed) * 0.45) * 55) + ((i * 7) % 25);
      bar.style.height = `${Math.min(95, Math.max(18, heightPercent))}%`;
      barsContainer.appendChild(bar);
      barElements.push(bar);
    }

    mainTrack.appendChild(headerLine);
    mainTrack.appendChild(barsContainer);

    // Speed Multiplier Button
    const speedBtn = document.createElement('button');
    speedBtn.className = 'waveform-speed-btn';
    speedBtn.setAttribute('type', 'button');
    speedBtn.title = 'تغيير سرعة التشغيل';
    speedBtn.textContent = '1x';

    let currentSpeedIndex = 0;
    const speeds = [1.0, 1.5, 2.0];

    speedBtn.onclick = (e) => {
      e.stopPropagation();
      currentSpeedIndex = (currentSpeedIndex + 1) % speeds.length;
      const newSpeed = speeds[currentSpeedIndex];
      audio.playbackRate = newSpeed;
      speedBtn.textContent = `${newSpeed}x`;
    };

    // Click on waveform to seek
    barsContainer.onclick = (e) => {
      e.stopPropagation();
      const rect = barsContainer.getBoundingClientRect();
      const clickX = e.clientX - rect.left;
      const percent = Math.max(0, Math.min(1, clickX / rect.width));
      if (audio.duration) {
        audio.currentTime = percent * audio.duration;
      }
    };

    // Format seconds to mm:ss
    const formatAudioTime = (sec) => {
      if (isNaN(sec) || sec < 0) return '00:00';
      const m = Math.floor(sec / 60);
      const s = Math.floor(sec % 60);
      return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    audio.addEventListener('loadedmetadata', () => {
      timeLabel.textContent = formatAudioTime(audio.duration);
    });

    audio.addEventListener('timeupdate', () => {
      if (!audio.duration) return;
      const progress = audio.currentTime / audio.duration;
      timeLabel.textContent = `${formatAudioTime(audio.currentTime)} / ${formatAudioTime(audio.duration)}`;
      
      const activeBarCount = Math.floor(progress * totalBars);
      barElements.forEach((bar, idx) => {
        bar.classList.toggle('played', idx <= activeBarCount);
      });
    });

    audio.addEventListener('play', () => {
      // Pause any previously playing audio instance
      if (state.activeAudioPlayer && state.activeAudioPlayer !== audio) {
        try { state.activeAudioPlayer.pause(); } catch(e){}
      }
      state.activeAudioPlayer = audio;
      playBtn.innerHTML = `<i class="fa-solid fa-pause"></i>`;
      playBtn.classList.add('playing');
      wrapper.classList.add('is-playing');
    });

    audio.addEventListener('pause', () => {
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
      playBtn.classList.remove('playing');
      wrapper.classList.remove('is-playing');
      if (state.activeAudioPlayer === audio) {
        state.activeAudioPlayer = null;
      }
    });

    audio.addEventListener('ended', () => {
      playBtn.innerHTML = `<i class="fa-solid fa-play"></i>`;
      playBtn.classList.remove('playing');
      wrapper.classList.remove('is-playing');
      barElements.forEach(bar => bar.classList.remove('played'));
      timeLabel.textContent = formatAudioTime(audio.duration);
      if (state.activeAudioPlayer === audio) {
        state.activeAudioPlayer = null;
      }
    });

    playBtn.onclick = (e) => {
      e.stopPropagation();
      if (audio.paused) {
        audio.play().catch(err => console.warn('Audio play error:', err));
      } else {
        audio.pause();
      }
    };

    wrapper.appendChild(playBtn);
    wrapper.appendChild(mainTrack);
    wrapper.appendChild(speedBtn);

    return wrapper;
  }

  // --------------------------------------------------------------------------
  // 11. Family Polls & Interactive Voting
  // --------------------------------------------------------------------------
  function createPollMessageElement(msg) {
    const poll = msg.pollData || {
      question: msg.text || 'استطلاع رأي عائلي',
      options: [],
      multiChoice: false,
      isClosed: false,
      createdBy: msg.sender
    };

    const container = document.createElement('div');
    container.className = 'family-poll-container';
    container.setAttribute('data-poll-msg-id', msg.id);

    // Compute total votes
    let totalVotes = 0;
    const optionVoteCounts = (poll.options || []).map(opt => {
      const votes = Array.isArray(opt.votes) ? opt.votes : [];
      totalVotes += votes.length;
      return votes.length;
    });

    const isCreatorOrAdmin = msg.sender === state.currentUser || state.currentUser.includes('الوالد') || state.currentUser.includes('يحيي');

    // Header
    const header = document.createElement('div');
    header.className = 'poll-header';
    header.innerHTML = `
      <div class="poll-badge-row">
        <span class="poll-tag ${poll.isClosed ? 'closed' : 'active'}">
          <i class="fa-solid ${poll.isClosed ? 'fa-lock' : 'fa-square-poll-vertical'}"></i>
          ${poll.isClosed ? 'تم إغلاق التصويت' : 'استطلاع رأي نشط'}
        </span>
        <span class="poll-type-tag">${poll.multiChoice ? 'اختيار متعدد' : 'اختيار فردي'}</span>
      </div>
      <h4 class="poll-question-title">${escapeHTML(poll.question)}</h4>
    `;
    container.appendChild(header);

    // Options List
    const optionsList = document.createElement('div');
    optionsList.className = 'poll-options-list';

    (poll.options || []).forEach((opt, idx) => {
      const votes = Array.isArray(opt.votes) ? opt.votes : [];
      const hasVoted = votes.includes(state.currentUser);
      const count = votes.length;
      const percent = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;

      const optRow = document.createElement('div');
      optRow.className = `poll-option-row ${hasVoted ? 'voted' : ''} ${poll.isClosed ? 'closed' : ''}`;

      // Progress Fill Track
      const fillBar = document.createElement('div');
      fillBar.className = 'poll-option-fill';
      fillBar.style.width = `${percent}%`;
      optRow.appendChild(fillBar);

      // Content Layer
      const optContent = document.createElement('div');
      optContent.className = 'poll-option-content';

      const checkIcon = document.createElement('span');
      checkIcon.className = 'poll-check-icon';
      checkIcon.innerHTML = hasVoted 
        ? `<i class="fa-solid fa-circle-check"></i>` 
        : `<i class="fa-regular ${poll.multiChoice ? 'fa-square' : 'fa-circle'}"></i>`;

      const optText = document.createElement('span');
      optText.className = 'poll-option-text';
      optText.textContent = opt.text;

      const optStats = document.createElement('span');
      optStats.className = 'poll-option-stats';
      optStats.innerHTML = `<strong>${percent}%</strong> (${count})`;

      optContent.appendChild(checkIcon);
      optContent.appendChild(optText);
      optContent.appendChild(optStats);
      optRow.appendChild(optContent);

      // Voter Avatars Preview
      if (votes.length > 0) {
        const votersWrap = document.createElement('div');
        votersWrap.className = 'poll-voters-bar';
        votes.slice(0, 5).forEach(voterName => {
          const voterChip = document.createElement('span');
          voterChip.className = 'poll-voter-chip';
          voterChip.title = voterName;
          const avSrc = getMemberAvatar(voterName);
          if (avSrc) {
            voterChip.innerHTML = `<img src="${avSrc}" alt="${escapeHTML(voterName)}">`;
          } else {
            voterChip.textContent = getInitials(voterName);
            voterChip.style.background = getAvatarColor(voterName);
          }
          votersWrap.appendChild(voterChip);
        });
        if (votes.length > 5) {
          const moreBadge = document.createElement('span');
          moreBadge.className = 'poll-voter-more';
          moreBadge.textContent = `+${votes.length - 5}`;
          votersWrap.appendChild(moreBadge);
        }
        optRow.appendChild(votersWrap);
      }

      // Voting Click Handler
      if (!poll.isClosed) {
        optRow.onclick = (e) => {
          e.stopPropagation();
          handlePollVote(msg.id, opt.id);
        };
      }

      optionsList.appendChild(optRow);
    });

    container.appendChild(optionsList);

    // Footer Info & Actions
    const footer = document.createElement('div');
    footer.className = 'poll-footer-info';
    footer.innerHTML = `
      <span class="poll-total-votes"><i class="fa-solid fa-users"></i> إجمالي الأصوات: <strong>${totalVotes}</strong></span>
    `;

    if (isCreatorOrAdmin) {
      const toggleCloseBtn = document.createElement('button');
      toggleCloseBtn.className = 'btn-poll-action';
      toggleCloseBtn.type = 'button';
      toggleCloseBtn.innerHTML = poll.isClosed 
        ? `<i class="fa-solid fa-lock-open"></i> إعادة فتح التصويت` 
        : `<i class="fa-solid fa-lock"></i> إنهاء الاستطلاع`;
      
      toggleCloseBtn.onclick = (e) => {
        e.stopPropagation();
        togglePollClose(msg.id);
      };
      footer.appendChild(toggleCloseBtn);
    }

    container.appendChild(footer);
    return container;
  }

  function handlePollVote(msgId, optionId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg || !msg.pollData || msg.pollData.isClosed) return;

    const poll = msg.pollData;
    const voter = state.currentUser;

    if (!poll.multiChoice) {
      // Single choice: remove from other options first
      poll.options.forEach(opt => {
        if (!Array.isArray(opt.votes)) opt.votes = [];
        opt.votes = opt.votes.filter(name => name !== voter);
      });
      // Toggle on the clicked option
      const targetOpt = poll.options.find(opt => opt.id === optionId);
      if (targetOpt) {
        targetOpt.votes.push(voter);
      }
    } else {
      // Multiple choice: toggle on clicked option
      const targetOpt = poll.options.find(opt => opt.id === optionId);
      if (targetOpt) {
        if (!Array.isArray(targetOpt.votes)) targetOpt.votes = [];
        if (targetOpt.votes.includes(voter)) {
          targetOpt.votes = targetOpt.votes.filter(name => name !== voter);
        } else {
          targetOpt.votes.push(voter);
        }
      }
    }

    // Save and Sync
    saveMessagesCache();
    renderMessages();

    if (state.isFirebaseReady && state.firestore) {
      updateDoc(doc(state.firestore, 'yahia_messages', msgId), {
        pollData: poll
      }).catch(err => console.warn('Firestore poll vote sync note:', err));
    } else if (state.isFirebaseReady && state.dbRef) {
      state.dbRef.child(msgId).child('pollData').set(poll);
    }
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: msg });
      } catch(e){}
    }
  }

  function togglePollClose(msgId) {
    const msg = state.messages.find(m => m.id === msgId);
    if (!msg || !msg.pollData) return;

    msg.pollData.isClosed = !msg.pollData.isClosed;
    saveMessagesCache();
    renderMessages();

    if (state.isFirebaseReady && state.firestore) {
      updateDoc(doc(state.firestore, 'yahia_messages', msgId), {
        pollData: msg.pollData
      }).catch(err => console.warn('Firestore poll toggle note:', err));
    } else if (state.isFirebaseReady && state.dbRef) {
      state.dbRef.child(msgId).child('pollData').child('isClosed').set(msg.pollData.isClosed);
    }
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: msg });
      } catch(e){}
    }
  }

  function openPollCreateModal() {
    if (DOM.pollCreateModal) {
      DOM.pollQuestionInput.value = '';
      DOM.pollMultiChoice.checked = false;
      resetPollOptionsInputs();
      DOM.pollCreateModal.style.display = 'flex';
      setTimeout(() => DOM.pollQuestionInput.focus(), 100);
    }
  }

  function resetPollOptionsInputs() {
    if (!DOM.pollOptionsList) return;
    DOM.pollOptionsList.innerHTML = `
      <div class="poll-option-input-row">
        <span class="poll-option-num">1</span>
        <input type="text" class="poll-opt-input" placeholder="الخيار الأول (مثال: نزهة برية)" maxlength="60">
      </div>
      <div class="poll-option-input-row">
        <span class="poll-option-num">2</span>
        <input type="text" class="poll-opt-input" placeholder="الخيار الثاني (مثال: زيارة الشاطئ)" maxlength="60">
      </div>
    `;
  }

  function addPollOptionInput() {
    if (!DOM.pollOptionsList) return;
    const currentRows = DOM.pollOptionsList.querySelectorAll('.poll-option-input-row');
    if (currentRows.length >= 6) {
      alert('الحد الأقصى لخيارات الاستطلاع هو 6 خيارات.');
      return;
    }
    const newIdx = currentRows.length + 1;
    const row = document.createElement('div');
    row.className = 'poll-option-input-row';
    row.innerHTML = `
      <span class="poll-option-num">${newIdx}</span>
      <input type="text" class="poll-opt-input" placeholder="خيار إضافي ${newIdx}" maxlength="60">
      <button type="button" class="btn-remove-opt" title="حذف هذا الخيار"><i class="fa-solid fa-xmark"></i></button>
    `;
    row.querySelector('.btn-remove-opt').onclick = () => {
      row.remove();
      // Renumber
      DOM.pollOptionsList.querySelectorAll('.poll-option-input-row').forEach((r, i) => {
        r.querySelector('.poll-option-num').textContent = i + 1;
      });
    };
    DOM.pollOptionsList.appendChild(row);
    row.querySelector('input').focus();
  }

  function submitPoll() {
    const question = (DOM.pollQuestionInput ? DOM.pollQuestionInput.value : '').trim();
    if (!question) {
      alert('يرجى كتابة سؤال الاستطلاع أولاً.');
      if (DOM.pollQuestionInput) DOM.pollQuestionInput.focus();
      return;
    }

    const optInputs = DOM.pollOptionsList.querySelectorAll('.poll-opt-input');
    const options = [];
    optInputs.forEach((inp, idx) => {
      const val = inp.value.trim();
      if (val) {
        options.push({
          id: `opt_${Date.now()}_${idx}`,
          text: val,
          votes: []
        });
      }
    });

    if (options.length < 2) {
      alert('يرجى تحديد خيارين على الأقل للاستطلاع.');
      return;
    }

    const multiChoice = DOM.pollMultiChoice ? DOM.pollMultiChoice.checked : false;

    const pollMessage = {
      id: `msg_poll_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender: state.currentUser,
      senderAvatar: state.currentUserAvatar || getMemberAvatar(state.currentUser) || '',
      type: 'poll',
      text: `📊 استطلاع رأي عائلي: ${question}`,
      pollData: {
        question: question,
        options: options,
        multiChoice: multiChoice,
        isClosed: false,
        createdBy: state.currentUser
      },
      timestamp: Date.now(),
      reactions: {},
      synced: false
    };

    if (DOM.pollCreateModal) {
      DOM.pollCreateModal.style.display = 'none';
    }

    // Save locally
    state.messages.push(pollMessage);
    saveMessagesCache();
    renderMessages(pollMessage.id);
    scrollToBottom(true);
    playNotificationSound();

    // Broadcast across tabs
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({ type: 'NEW_MESSAGE', message: pollMessage });
      } catch(e){}
    }

    // Firebase Firestore Sync
    if (state.isFirebaseReady && state.firestore) {
      setDoc(doc(state.firestore, 'yahia_messages', pollMessage.id), pollMessage)
        .then(() => {
          const target = state.messages.find(m => m.id === pollMessage.id);
          if (target) {
            target.synced = true;
            saveMessagesCache();
            renderMessages();
          }
        })
        .catch(err => {
          console.warn('Firestore poll sync error:', err);
          showToast(`⚠️ تعذر مزامنة الاستطلاع: ${err.message || 'خطأ في الاتصال'}`, 'warning');
        });
    } else if (state.isFirebaseReady && state.dbRef) {
      state.dbRef.child(pollMessage.id).set(pollMessage);
    }
  }

  // --------------------------------------------------------------------------
  // 12. Pinned Family Announcements
  // --------------------------------------------------------------------------
  function initPinnedAnnouncements() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT);
      if (saved) {
        state.pinnedAnnouncement = JSON.parse(saved);
      }
    } catch(e){}

    renderPinnedBanner();

    // Sync with Firebase RTDB if available
    if (window.firebase && firebase.apps.length) {
      try {
        state.announcementDbRef = firebase.database().ref('yahia_family_announcement');
        state.announcementDbRef.on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) {
            state.pinnedAnnouncement = val;
            localStorage.setItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT, JSON.stringify(val));
          } else {
            state.pinnedAnnouncement = null;
            localStorage.removeItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT);
          }
          renderPinnedBanner();
        });
      } catch(e){}
    }
  }

  function renderPinnedBanner() {
    if (!DOM.pinnedAnnouncementBanner) return;

    if (state.pinnedAnnouncement && state.pinnedAnnouncement.text) {
      DOM.pinnedAnnouncementBanner.style.display = 'flex';
      if (DOM.pinnedTitle) DOM.pinnedTitle.textContent = state.pinnedAnnouncement.title || 'إعلان عائلي هام';
      if (DOM.pinnedSender) DOM.pinnedSender.textContent = `بواسطة: ${state.pinnedAnnouncement.sender || 'إدارة العائلة'}`;
      if (DOM.pinnedText) DOM.pinnedText.textContent = state.pinnedAnnouncement.text;
      if (DOM.pinnedBadgeDot) DOM.pinnedBadgeDot.style.display = 'block';
    } else {
      DOM.pinnedAnnouncementBanner.style.display = 'none';
      if (DOM.pinnedBadgeDot) DOM.pinnedBadgeDot.style.display = 'none';
    }
  }

  function openAnnouncementModal() {
    if (!DOM.announcementModal) return;
    if (state.pinnedAnnouncement) {
      DOM.announcementTitleInput.value = state.pinnedAnnouncement.title || '';
      DOM.announcementTextInput.value = state.pinnedAnnouncement.text || '';
      if (DOM.unpinAnnouncementBtn) DOM.unpinAnnouncementBtn.style.display = 'inline-flex';
    } else {
      DOM.announcementTitleInput.value = '';
      DOM.announcementTextInput.value = '';
      if (DOM.unpinAnnouncementBtn) DOM.unpinAnnouncementBtn.style.display = 'none';
    }
    DOM.announcementModal.style.display = 'flex';
    setTimeout(() => DOM.announcementTitleInput.focus(), 100);
  }

  function savePinnedAnnouncement() {
    const title = (DOM.announcementTitleInput ? DOM.announcementTitleInput.value : '').trim();
    const text = (DOM.announcementTextInput ? DOM.announcementTextInput.value : '').trim();

    if (!text) {
      alert('يرجى كتابة نص الإعلان أو الملاحظة العائلية.');
      if (DOM.announcementTextInput) DOM.announcementTextInput.focus();
      return;
    }

    const announcementData = {
      title: title || 'إعلان عائلي هام',
      text: text,
      sender: state.currentUser,
      timestamp: Date.now()
    };

    state.pinnedAnnouncement = announcementData;
    localStorage.setItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT, JSON.stringify(announcementData));
    renderPinnedBanner();

    if (DOM.announcementModal) DOM.announcementModal.style.display = 'none';

    if (state.isFirebaseReady && state.firestore) {
      setDoc(doc(state.firestore, 'yahia_announcements', 'current_pinned'), announcementData).catch(console.warn);
    } else if (state.isFirebaseReady && state.announcementDbRef) {
      state.announcementDbRef.set(announcementData);
    }
  }

  function unpinAnnouncement() {
    state.pinnedAnnouncement = null;
    localStorage.removeItem(STORAGE_KEYS.PINNED_ANNOUNCEMENT);
    renderPinnedBanner();

    if (DOM.announcementModal) DOM.announcementModal.style.display = 'none';

    if (state.isFirebaseReady && state.firestore) {
      deleteDoc(doc(state.firestore, 'yahia_announcements', 'current_pinned')).catch(console.warn);
    } else if (state.isFirebaseReady && state.announcementDbRef) {
      state.announcementDbRef.remove();
    }
  }

  // --------------------------------------------------------------------------
  // 13. Family Calendar & Events System
  // --------------------------------------------------------------------------
  const DEFAULT_FAMILY_EVENTS = [
    {
      id: 'evt_1',
      category: 'birthday',
      title: 'عيد ميلاد الوالد يحيي صبيح 🎂',
      date: '2026-09-15',
      member: 'يحيي صبيح (الوالد)',
      notes: 'نسأل الله له دوام الصحة والعافية وطول العمر في طاعته'
    },
    {
      id: 'evt_2',
      category: 'gathering',
      title: 'الاجتماع العائلي الدوري الأسبوعي',
      date: '2026-08-20',
      member: 'كافة أفراد العائلة',
      notes: 'التجمع بعد صلاة العشاء في منزل الوالد'
    },
    {
      id: 'evt_3',
      category: 'graduation',
      title: 'حفل تخرج وتكريم أبناء العائلة',
      date: '2026-08-28',
      member: 'الخريجين والناجحين',
      notes: 'توزيع الهدايا التذكارية والاحتفال بالنجاح'
    },
    {
      id: 'evt_4',
      category: 'islamic',
      title: 'ذكرى المولد النبوي الشريف 🌙',
      date: '2026-09-04',
      member: 'العائلة الكريمة',
      notes: 'أعاده الله علينا وعليكم بالخير واليمن والبركات'
    }
  ];

  function initFamilyEvents() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAMILY_EVENTS);
      if (saved) {
        state.familyEvents = JSON.parse(saved);
      } else {
        state.familyEvents = DEFAULT_FAMILY_EVENTS;
        localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));
      }
    } catch(e){
      state.familyEvents = DEFAULT_FAMILY_EVENTS;
    }

    updateEventsBadgeUI();

    // Firebase RTDB Sync
    if (window.firebase && firebase.apps.length) {
      try {
        state.eventsDbRef = firebase.database().ref('yahia_family_events');
        state.eventsDbRef.on('value', (snapshot) => {
          const val = snapshot.val();
          if (val) {
            state.familyEvents = Array.isArray(val) ? val : Object.values(val);
            localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));
            updateEventsBadgeUI();
            if (DOM.eventsCalendarModal && DOM.eventsCalendarModal.style.display !== 'none') {
              renderFamilyEventsList();
            }
          }
        });
      } catch(e){}
    }
  }

  function getDaysUntil(dateStr) {
    if (!dateStr) return { days: 999, text: '', statusClass: '' };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return { days: 0, text: 'اليوم 🎉', statusClass: 'today' };
    } else if (diffDays === 1) {
      return { days: 1, text: 'غداً ⏳', statusClass: 'soon' };
    } else if (diffDays > 1 && diffDays <= 7) {
      return { days: diffDays, text: `بعد ${diffDays} أيام`, statusClass: 'soon' };
    } else if (diffDays > 7) {
      return { days: diffDays, text: `بعد ${diffDays} يوماً`, statusClass: 'upcoming' };
    } else {
      return { days: diffDays, text: `مضت منذ ${Math.abs(diffDays)} يوماً`, statusClass: 'past' };
    }
  }

  function updateEventsBadgeUI() {
    const upcoming = state.familyEvents.filter(ev => {
      const { days } = getDaysUntil(ev.date);
      return days >= 0 && days <= 30;
    });

    if (DOM.eventsCountBadge) {
      if (upcoming.length > 0) {
        DOM.eventsCountBadge.textContent = upcoming.length;
        DOM.eventsCountBadge.style.display = 'block';
      } else {
        DOM.eventsCountBadge.style.display = 'none';
      }
    }
    if (DOM.upcomingEventsCount) {
      DOM.upcomingEventsCount.textContent = `${upcoming.length} مناسبة قادمة هذا الشهر`;
    }
  }

  function renderFamilyEventsList() {
    if (!DOM.eventsListContainer) return;
    DOM.eventsListContainer.innerHTML = '';

    if (state.familyEvents.length === 0) {
      DOM.eventsListContainer.innerHTML = `
        <div class="events-empty-state">
          <i class="fa-solid fa-calendar-xmark"></i>
          <p>لا توجد مناسبات مسجلة حتى الآن. اضغط على "إضافة مناسبة جديدة" بالأعلى لتسجيل أعياد الميلاد واللقاءات العائلية.</p>
        </div>
      `;
      return;
    }

    // Sort by nearest date
    const sorted = [...state.familyEvents].sort((a, b) => {
      const da = getDaysUntil(a.date).days;
      const db = getDaysUntil(b.date).days;
      if (da >= 0 && db >= 0) return da - db;
      if (da >= 0 && db < 0) return -1;
      if (da < 0 && db >= 0) return 1;
      return db - da;
    });

    const categoryIcons = {
      birthday: '🎂',
      anniversary: '💍',
      graduation: '🎓',
      gathering: '👨‍👩‍👧‍👦',
      islamic: '🌙',
      other: '🎉'
    };

    sorted.forEach(ev => {
      const countdown = getDaysUntil(ev.date);
      const card = document.createElement('div');
      card.className = `event-item-card category-${ev.category || 'other'}`;

      card.innerHTML = `
        <div class="event-card-header">
          <div class="event-type-icon">${categoryIcons[ev.category] || '🎉'}</div>
          <div class="event-title-wrap">
            <h4 class="event-title">${escapeHTML(ev.title)}</h4>
            <div class="event-meta-line">
              <span><i class="fa-regular fa-calendar"></i> ${ev.date}</span>
              ${ev.member ? `<span><i class="fa-regular fa-user"></i> ${escapeHTML(ev.member)}</span>` : ''}
            </div>
          </div>
          <div class="event-header-badges">
            <span class="event-countdown-badge ${countdown.statusClass}">${countdown.text}</span>
            <button type="button" class="btn-event-quick-delete" data-event-id="${ev.id}" title="حذف هذه المناسبة من التقويم">
              <i class="fa-solid fa-trash-can"></i>
            </button>
          </div>
        </div>
        ${ev.notes ? `<p class="event-notes">${escapeHTML(ev.notes)}</p>` : ''}
        <div class="event-card-footer">
          <button type="button" class="btn-event-greet" data-event-id="${ev.id}">
            <i class="fa-solid fa-heart"></i> إرسال تهنئة في الدردشة
          </button>
          <button type="button" class="btn-event-delete" data-event-id="${ev.id}" title="حذف هذه المناسبة نهائياً">
            <i class="fa-solid fa-trash-can"></i> <span>حذف المناسبة</span>
          </button>
        </div>
      `;

      card.querySelector('.btn-event-greet').onclick = () => {
        sendEventGreeting(ev);
        DOM.eventsCalendarModal.style.display = 'none';
      };

      const quickDelBtn = card.querySelector('.btn-event-quick-delete');
      if (quickDelBtn) {
        quickDelBtn.onclick = (e) => {
          e.stopPropagation();
          promptDeleteFamilyEvent(ev);
        };
      }

      const footerDelBtn = card.querySelector('.btn-event-delete');
      if (footerDelBtn) {
        footerDelBtn.onclick = (e) => {
          e.stopPropagation();
          promptDeleteFamilyEvent(ev);
        };
      }

      DOM.eventsListContainer.appendChild(card);
    });
  }

  function sendEventGreeting(ev) {
    const greetingText = `🌹 بمناسبة: ${ev.title}، نتقدم بأحر التهاني والتبريكات سائلين المولى عز وجل أن يبارك في عائلتنا ويديم علينا المحبة والسرور 🤲✨`;
    DOM.messageInput.value = greetingText;
    sendMessage();
  }

  function saveNewFamilyEvent() {
    const title = (DOM.eventTitleInput ? DOM.eventTitleInput.value : '').trim();
    const date = (DOM.eventDateInput ? DOM.eventDateInput.value : '').trim();
    const category = DOM.eventCategorySelect ? DOM.eventCategorySelect.value : 'birthday';
    const member = (DOM.eventMemberInput ? DOM.eventMemberInput.value : '').trim();
    const notes = (DOM.eventNotesInput ? DOM.eventNotesInput.value : '').trim();

    if (!title || !date) {
      showToast('يرجى إدخال عنوان المناسبة وتاريخها', 'warning');
      return;
    }

    const newEvent = {
      id: `evt_${Date.now()}`,
      category,
      title,
      date,
      member,
      notes
    };

    state.familyEvents.push(newEvent);
    localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));

    if (DOM.addEventFormCard) DOM.addEventFormCard.style.display = 'none';
    if (DOM.eventTitleInput) DOM.eventTitleInput.value = '';
    if (DOM.eventDateInput) DOM.eventDateInput.value = '';
    if (DOM.eventMemberInput) DOM.eventMemberInput.value = '';
    if (DOM.eventNotesInput) DOM.eventNotesInput.value = '';

    updateEventsBadgeUI();
    renderFamilyEventsList();
    showToast('تمت إضافة المناسبة بنجاح 🎉', 'success');

    // Broadcast update across tabs
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({
          type: 'EVENTS_UPDATED',
          events: state.familyEvents
        });
      } catch (e) {}
    }

    if (state.isFirebaseReady && state.firestore) {
      setDoc(doc(state.firestore, 'yahia_events', newEvent.id), newEvent).catch(console.warn);
    } else if (state.isFirebaseReady && state.eventsDbRef) {
      state.eventsDbRef.set(state.familyEvents);
    }
  }

  function promptDeleteFamilyEvent(ev) {
    if (!ev) return;
    state.pendingDeleteEventId = ev.id;
    if (DOM.deleteEventTargetTitle) {
      DOM.deleteEventTargetTitle.textContent = ev.title || 'مناسبة عائلية';
    }
    if (DOM.deleteEventTargetDate) {
      DOM.deleteEventTargetDate.innerHTML = `<i class="fa-regular fa-calendar"></i> ${ev.date || ''} ${ev.member ? ` • ${escapeHTML(ev.member)}` : ''}`;
    }
    if (DOM.deleteEventConfirmModal) {
      DOM.deleteEventConfirmModal.style.display = 'flex';
    } else {
      executeDeleteFamilyEvent(ev.id);
    }
  }

  function closeDeleteEventConfirmModal() {
    state.pendingDeleteEventId = null;
    if (DOM.deleteEventConfirmModal) {
      DOM.deleteEventConfirmModal.style.display = 'none';
    }
  }

  function executeDeleteFamilyEvent(id) {
    const targetId = id || state.pendingDeleteEventId;
    if (!targetId) return;

    state.familyEvents = state.familyEvents.filter(ev => ev.id !== targetId);
    localStorage.setItem(STORAGE_KEYS.FAMILY_EVENTS, JSON.stringify(state.familyEvents));
    updateEventsBadgeUI();
    renderFamilyEventsList();
    closeDeleteEventConfirmModal();
    showToast('تم حذف المناسبة من التقويم بنجاح 🗑️', 'info');

    // Broadcast update across open tabs
    if (state.broadcastChannel) {
      try {
        state.broadcastChannel.postMessage({
          type: 'EVENTS_UPDATED',
          events: state.familyEvents
        });
      } catch (e) {}
    }

    if (state.isFirebaseReady && state.firestore) {
      deleteDoc(doc(state.firestore, 'yahia_events', targetId)).catch(console.warn);
    } else if (state.isFirebaseReady && state.eventsDbRef) {
      state.eventsDbRef.set(state.familyEvents);
    }
  }

  // --------------------------------------------------------------------------
  // 14. Family Albums & Memory Wall Vault
  // --------------------------------------------------------------------------
  const DEFAULT_FAMILY_MEMORIES = [
    {
      id: 'mem_1',
      category: 'celebrations',
      caption: 'فرحة الأعياد ولمة العائلة في بيت الوالد يحيي صبيح 🌸',
      imageUrl: 'https://images.unsplash.com/photo-1511895426328-dc8714191300?auto=format&fit=crop&w=600&q=80',
      sender: 'يحيي صبيح (الوالد)',
      timestamp: Date.now() - 86400000 * 30
    },
    {
      id: 'mem_2',
      category: 'trips',
      caption: 'رحلتنا ونزهتنا العائلية السنوية في أحضان الطبيعة 🌲',
      imageUrl: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=600&q=80',
      sender: 'محمد يحيي صبيح',
      timestamp: Date.now() - 86400000 * 60
    },
    {
      id: 'mem_3',
      category: 'vintage',
      caption: 'صورة من الزمن الجميل تجمع الأبناء في الصغر ✨',
      imageUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80',
      sender: 'أم محمد (الوالدة)',
      timestamp: Date.now() - 86400000 * 120
    }
  ];

  function initFamilyMemories() {
    try {
      const saved = localStorage.getItem(STORAGE_KEYS.FAMILY_MEMORIES);
      if (saved) {
        state.familyMemories = JSON.parse(saved);
      } else {
        state.familyMemories = DEFAULT_FAMILY_MEMORIES;
        localStorage.setItem(STORAGE_KEYS.FAMILY_MEMORIES, JSON.stringify(state.familyMemories));
      }
    } catch(e){
      state.familyMemories = DEFAULT_FAMILY_MEMORIES;
    }
  }

  function renderFamilyAlbums(filter = 'all') {
    state.currentAlbumFilter = filter;
    if (!DOM.galleryGrid) return;
    DOM.galleryGrid.innerHTML = '';

    if (DOM.albumFilterBar) {
      DOM.albumFilterBar.querySelectorAll('.album-filter-pill').forEach(btn => {
        btn.classList.toggle('active', btn.getAttribute('data-filter') === filter);
      });
    }

    const filtered = filter === 'all' 
      ? state.familyMemories 
      : state.familyMemories.filter(m => m.category === filter);

    if (DOM.galleryAlbumCount) {
      DOM.galleryAlbumCount.textContent = state.familyMemories.length;
    }

    if (filtered.length === 0) {
      DOM.galleryGrid.innerHTML = `
        <div class="gallery-empty" style="grid-column: 1 / -1; padding: 30px;">
          <i class="fa-solid fa-photo-film" style="font-size: 2.5rem; color: var(--accent-color); margin-bottom: 12px;"></i>
          <p>لا توجد ذكريات في هذا الألبوم بعد. اضغط على "+ إضافة ذكرى جديدة" لإضافة أول صورة!</p>
        </div>
      `;
      return;
    }

    filtered.forEach(mem => {
      const card = document.createElement('div');
      card.className = 'family-memory-card';
      card.innerHTML = `
        <div class="memory-card-img-wrap">
          <img src="${mem.imageUrl}" alt="${escapeHTML(mem.caption || 'ذكرى عائلية')}" loading="lazy">
          <span class="memory-category-tag">${getAlbumCategoryLabel(mem.category)}</span>
        </div>
        <div class="memory-card-body">
          <p class="memory-caption">${escapeHTML(mem.caption || '')}</p>
          <div class="memory-meta">
            <span class="memory-sender"><i class="fa-regular fa-user"></i> ${escapeHTML(mem.sender || '')}</span>
            <span class="memory-date">${formatArabicTime(new Date(mem.timestamp))}</span>
          </div>
        </div>
      `;

      card.onclick = () => {
        const allImgs = filtered.map(m => ({
          url: m.imageUrl,
          sender: m.sender,
          time: formatArabicTime(new Date(m.timestamp))
        }));
        const idx = allImgs.findIndex(i => i.url === mem.imageUrl);
        openLightbox(mem.imageUrl, mem.sender, formatArabicTime(new Date(mem.timestamp)), allImgs, idx >= 0 ? idx : 0);
      };

      DOM.galleryGrid.appendChild(card);
    });
  }

  function getAlbumCategoryLabel(cat) {
    const labels = {
      trips: '🌲 رحلات ونزهات',
      vintage: '🕰️ الزمن الجميل',
      celebrations: '🎉 مناسبات وأعياد',
      daily: '☕ يوميات العائلة'
    };
    return labels[cat] || '📸 ذكريات';
  }

  async function saveNewMemory() {
    const caption = (DOM.memoryCaptionInput ? DOM.memoryCaptionInput.value : '').trim();
    const category = DOM.memoryAlbumCategory ? DOM.memoryAlbumCategory.value : 'celebrations';
    const previewImg = DOM.memoryPreviewImg ? DOM.memoryPreviewImg.src : '';

    if (!previewImg || previewImg.includes('data:image/svg') || previewImg === window.location.href) {
      alert('يرجى اختيار صورة للذكرى العائلية.');
      return;
    }

    let optimizedImg = previewImg;
    try {
      optimizedImg = await compressChatImage(previewImg, 900, 0.82);
    } catch(e) {
      console.warn('Memory compression fallback:', e);
    }

    const newMem = {
      id: `mem_${Date.now()}`,
      category,
      caption: caption || 'ذكرى عائلية جميلة',
      imageUrl: optimizedImg,
      sender: state.currentUser,
      timestamp: Date.now()
    };

    state.familyMemories.unshift(newMem);
    localStorage.setItem(STORAGE_KEYS.FAMILY_MEMORIES, JSON.stringify(state.familyMemories));

    if (DOM.addMemoryModal) DOM.addMemoryModal.style.display = 'none';
    if (DOM.memoryCaptionInput) DOM.memoryCaptionInput.value = '';
    if (DOM.memoryPreviewImg) DOM.memoryPreviewImg.src = '';
    if (DOM.memoryDropzone) DOM.memoryDropzone.classList.remove('has-image');

    renderGalleryTab('albums');
    updateMediaCounts();
    showToast('تمت إضافة الذكرى إلى ألبوم العائلة 📸', 'success');

    if (state.isFirebaseReady && state.firestore) {
      setDoc(doc(state.firestore, 'yahia_memories', newMem.id), newMem).catch(console.warn);
    }
  }

  // --------------------------------------------------------------------------
  // 15. Lightbox Carousel & Slideshow
  // --------------------------------------------------------------------------
  function openLightbox(imgSrc, sender, time, imageList = [], currentIndex = 0) {
    state.lightboxImages = imageList && imageList.length > 0 
      ? imageList 
      : [{ url: imgSrc, sender: sender, time: time }];
    state.lightboxCurrentIndex = currentIndex >= 0 ? currentIndex : 0;

    showLightboxIndex(state.lightboxCurrentIndex);
    DOM.lightboxModal.style.display = 'flex';
  }

  function showLightboxIndex(idx) {
    if (!state.lightboxImages || state.lightboxImages.length === 0) return;
    if (idx < 0) idx = state.lightboxImages.length - 1;
    if (idx >= state.lightboxImages.length) idx = 0;

    state.lightboxCurrentIndex = idx;
    const item = state.lightboxImages[idx];

    DOM.lightboxImg.src = item.url;
    DOM.lightboxSender.textContent = item.sender || 'عضو العائلة';
    DOM.lightboxTime.textContent = item.time || '';
    DOM.lightboxDownloadBtn.href = item.url;

    // Show/hide prev/next buttons based on list length
    const hasMultiple = state.lightboxImages.length > 1;
    if (DOM.lightboxPrevBtn) DOM.lightboxPrevBtn.style.display = hasMultiple ? 'flex' : 'none';
    if (DOM.lightboxNextBtn) DOM.lightboxNextBtn.style.display = hasMultiple ? 'flex' : 'none';
  }

  function lightboxPrev() {
    showLightboxIndex(state.lightboxCurrentIndex - 1);
  }

  function lightboxNext() {
    showLightboxIndex(state.lightboxCurrentIndex + 1);
  }

  // --------------------------------------------------------------------------
  // 16. Media Gallery Modal Rendering
  // --------------------------------------------------------------------------
  function openMediaGallery(tab = 'images') {
    DOM.mediaGalleryModal.style.display = 'flex';
    renderGalleryTab(tab);
  }

  function updateMediaCounts() {
    const images = state.messages.filter(m => m.mediaType === 'image');
    const videos = state.messages.filter(m => m.mediaType === 'video' || m.youtubeId);
    const audios = state.messages.filter(m => m.mediaType === 'audio');
    const links = state.messages.filter(m => m.text && m.text.includes('http'));

    if (DOM.galleryImgCount) DOM.galleryImgCount.textContent = images.length;
    if (DOM.galleryAlbumCount) DOM.galleryAlbumCount.textContent = state.familyMemories.length;
    if (DOM.galleryVidCount) DOM.galleryVidCount.textContent = videos.length;
    if (DOM.galleryAudCount) DOM.galleryAudCount.textContent = audios.length;
    if (DOM.galleryLinkCount) DOM.galleryLinkCount.textContent = links.length;
  }

  function renderGalleryTab(tab) {
    DOM.galleryGrid.innerHTML = '';
    const tabs = DOM.mediaGalleryModal.querySelectorAll('.gallery-tab');
    tabs.forEach(t => t.classList.toggle('active', t.getAttribute('data-tab') === tab));

    if (DOM.albumFilterBar) {
      DOM.albumFilterBar.style.display = tab === 'albums' ? 'flex' : 'none';
    }

    if (tab === 'albums') {
      renderFamilyAlbums(state.currentAlbumFilter || 'all');
    } else if (tab === 'images') {
      const images = state.messages.filter(m => m.mediaType === 'image');
      if (images.length === 0) {
        DOM.galleryGrid.innerHTML = '<div class="gallery-empty">لا توجد صور مشاركة حتى الآن</div>';
        return;
      }
      const allImgs = images.map(m => ({
        url: m.mediaUrl,
        sender: m.sender,
        time: formatArabicTime(new Date(m.timestamp))
      }));
      images.forEach((m, i) => {
        const card = document.createElement('div');
        card.className = 'gallery-item-card';
        card.innerHTML = `<img src="${m.mediaUrl}" alt="صورة">`;
        card.onclick = () => openLightbox(m.mediaUrl, m.sender, formatArabicTime(new Date(m.timestamp)), allImgs, i);
        DOM.galleryGrid.appendChild(card);
      });
    } else if (tab === 'videos') {
      const videos = state.messages.filter(m => m.mediaType === 'video' || m.youtubeId);
      if (videos.length === 0) {
        DOM.galleryGrid.innerHTML = '<div class="gallery-empty">لا توجد مقاطع فيديو حتى الآن</div>';
        return;
      }
      videos.forEach(m => {
        const card = document.createElement('div');
        card.className = 'gallery-item-card';
        if (m.youtubeId) {
          card.innerHTML = `<img src="https://img.youtube.com/vi/${m.youtubeId}/mqdefault.jpg" alt="YouTube Thumbnail">`;
        } else {
          card.innerHTML = `<video src="${m.mediaUrl}"></video>`;
        }
        DOM.galleryGrid.appendChild(card);
      });
    } else if (tab === 'audios') {
      const audios = state.messages.filter(m => m.mediaType === 'audio');
      if (audios.length === 0) {
        DOM.galleryGrid.innerHTML = '<div class="gallery-empty">لا توجد تسجيلات صوتية حتى الآن</div>';
        return;
      }
      audios.forEach(m => {
        const item = document.createElement('div');
        item.style.gridColumn = '1 / -1';
        item.style.backgroundColor = 'var(--bg-primary)';
        item.style.padding = '8px 12px';
        item.style.borderRadius = '8px';
        item.innerHTML = `
          <div style="font-size:0.8rem; margin-bottom:4px;"><strong>${escapeHTML(m.sender)}</strong> • ${formatArabicTime(new Date(m.timestamp))}</div>
          <audio controls src="${m.mediaUrl}" style="width:100%;"></audio>
        `;
        DOM.galleryGrid.appendChild(item);
      });
    } else if (tab === 'links') {
      const links = state.messages.filter(m => (m.text && m.text.includes('http')) || m.youtubeId);
      if (links.length === 0) {
        DOM.galleryGrid.innerHTML = '<div class="gallery-empty">لا توجد روابط حتى الآن</div>';
        return;
      }
      links.forEach(m => {
        const item = document.createElement('div');
        item.style.gridColumn = '1 / -1';
        item.innerHTML = `<div style="font-size:0.8rem; color:var(--text-muted);">${escapeHTML(m.sender)}:</div>${formatMessageText(m.text)}`;
        DOM.galleryGrid.appendChild(item);
      });
    }
  }

  // --------------------------------------------------------------------------
  // 11. Event Listeners & Interactions Setup
  // --------------------------------------------------------------------------
  function setupEventListeners() {
    // Message Form Submit & Send Button Click
    DOM.messageForm.addEventListener('submit', (e) => {
      e.preventDefault();
      sendMessage();
    });

    DOM.sendBtn.addEventListener('click', (e) => {
      e.preventDefault();
      sendMessage();
    });

    // Auto-expand Textarea on input
    DOM.messageInput.addEventListener('input', () => {
      DOM.messageInput.style.height = 'auto';
      DOM.messageInput.style.height = `${Math.min(DOM.messageInput.scrollHeight, 120)}px`;
    });

    // Submit on Enter key (Shift+Enter for new line)
    DOM.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // File & Camera Input Changes
    DOM.fileInput.addEventListener('click', () => {
      DOM.fileInput.value = '';
    });
    DOM.fileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    DOM.cameraInput.addEventListener('click', () => {
      DOM.cameraInput.value = '';
    });
    DOM.cameraInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files[0]) {
        handleFileSelect(e.target.files[0]);
      }
    });

    if (DOM.quickSendAttachmentBtn) {
      DOM.quickSendAttachmentBtn.addEventListener('click', (e) => {
        e.preventDefault();
        sendMessage();
      });
    }

    DOM.cancelAttachmentBtn.addEventListener('click', clearPendingAttachment);

    // Audio Voice Note Controls
    DOM.recordVoiceBtn.addEventListener('click', startAudioRecording);
    DOM.cancelRecordBtn.addEventListener('click', () => stopAudioRecording(false));
    DOM.sendRecordBtn.addEventListener('click', () => stopAudioRecording(true));

    // User Profile Switcher
    DOM.userProfileBtn.addEventListener('click', () => showUserSelectionModal(true));
    DOM.closeUserModalBtn.addEventListener('click', hideUserSelectionModal);

    // Avatar Customizer Events
    if (DOM.uploadAvatarBtn && DOM.avatarFileInput) {
      DOM.uploadAvatarBtn.addEventListener('click', () => DOM.avatarFileInput.click());
    }

    if (DOM.avatarFileInput) {
      DOM.avatarFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          try {
            const dataUrl = await compressAndCropSquareImage(e.target.files[0], 200, 0.88);
            state.tempSelectedAvatar = dataUrl;
            updateAvatarPreviewUI(dataUrl, DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
            if (DOM.presetAvatarsDrawer) DOM.presetAvatarsDrawer.style.display = 'none';
          } catch (err) {
            console.warn('Avatar image compression error:', err);
          }
        }
      });
    }

    if (DOM.avatarCameraInput) {
      DOM.avatarCameraInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          try {
            const dataUrl = await compressAndCropSquareImage(e.target.files[0], 200, 0.88);
            state.tempSelectedAvatar = dataUrl;
            updateAvatarPreviewUI(dataUrl, DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
            if (DOM.presetAvatarsDrawer) DOM.presetAvatarsDrawer.style.display = 'none';
          } catch (err) {
            console.warn('Camera avatar compression error:', err);
          }
        }
      });
    }

    if (DOM.openCameraAvatarBtn) {
      DOM.openCameraAvatarBtn.addEventListener('click', openCameraSnapshotModal);
    }

    if (DOM.togglePresetAvatarsBtn && DOM.presetAvatarsDrawer) {
      DOM.togglePresetAvatarsBtn.addEventListener('click', () => {
        const isHidden = DOM.presetAvatarsDrawer.style.display === 'none' || !DOM.presetAvatarsDrawer.style.display;
        DOM.presetAvatarsDrawer.style.display = isHidden ? 'block' : 'none';
      });
    }

    if (DOM.closePresetAvatarsBtn && DOM.presetAvatarsDrawer) {
      DOM.closePresetAvatarsBtn.addEventListener('click', () => {
        DOM.presetAvatarsDrawer.style.display = 'none';
      });
    }

    if (DOM.removeAvatarBtn) {
      DOM.removeAvatarBtn.addEventListener('click', () => {
        state.tempSelectedAvatar = '';
        updateAvatarPreviewUI('', DOM.customNameInput ? DOM.customNameInput.value : state.currentUser);
      });
    }

    if (DOM.customNameInput) {
      DOM.customNameInput.addEventListener('input', () => {
        if (!state.tempSelectedAvatar) {
          updateAvatarPreviewUI('', DOM.customNameInput.value);
        }
      });
    }

    // Live Camera Snapshot Modal Events
    if (DOM.closeCameraModalBtn) {
      DOM.closeCameraModalBtn.addEventListener('click', closeCameraSnapshotModal);
    }
    if (DOM.cancelCameraBtn) {
      DOM.cancelCameraBtn.addEventListener('click', closeCameraSnapshotModal);
    }
    if (DOM.snapPhotoBtn) {
      DOM.snapPhotoBtn.addEventListener('click', snapPhoto);
    }
    if (DOM.retakePhotoBtn) {
      DOM.retakePhotoBtn.addEventListener('click', retakePhoto);
    }
    if (DOM.useCapturedPhotoBtn) {
      DOM.useCapturedPhotoBtn.addEventListener('click', useCapturedPhoto);
    }
    if (DOM.switchCameraFacingBtn) {
      DOM.switchCameraFacingBtn.addEventListener('click', switchCameraFacing);
    }

    if (DOM.openBulkFromUserModalBtn) {
      DOM.openBulkFromUserModalBtn.addEventListener('click', openBulkMembersModal);
    }

    if (DOM.familyRosterBtn) {
      DOM.familyRosterBtn.addEventListener('click', openBulkMembersModal);
    }

    // Bulk Family Members Modal
    if (DOM.closeBulkModalBtn) {
      DOM.closeBulkModalBtn.addEventListener('click', hideBulkMembersModal);
    }
    if (DOM.cancelBulkModalBtn) {
      DOM.cancelBulkModalBtn.addEventListener('click', hideBulkMembersModal);
    }
    if (DOM.bulkNamesTextarea) {
      DOM.bulkNamesTextarea.addEventListener('input', updateBulkPreviewFromInput);
    }
    if (DOM.loadSampleNamesBtn) {
      DOM.loadSampleNamesBtn.addEventListener('click', loadSampleFamilyNames);
    }
    if (DOM.clearBulkInputBtn) {
      DOM.clearBulkInputBtn.addEventListener('click', () => {
        DOM.bulkNamesTextarea.value = '';
        updateBulkPreviewFromInput();
        DOM.bulkNamesTextarea.focus();
      });
    }
    if (DOM.saveBulkNamesBtn) {
      DOM.saveBulkNamesBtn.addEventListener('click', saveBulkNames);
    }
    if (DOM.settingsManageBulkBtn) {
      DOM.settingsManageBulkBtn.addEventListener('click', openBulkMembersModal);
    }

    DOM.saveUserNameBtn.addEventListener('click', () => {
      const val = DOM.customNameInput.value;
      saveUserName(val);
    });

    DOM.customNameInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveUserName(DOM.customNameInput.value);
      }
    });

    // Quick Family Greeting Pills in Welcome Banner
    DOM.quickGreetingPills.addEventListener('click', (e) => {
      const pill = e.target.closest('.greeting-pill');
      if (pill) {
        const greeting = pill.getAttribute('data-text');
        DOM.messageInput.value = greeting;
        sendMessage();
      }
    });

    // Quick Emoji Bar Chips
    DOM.quickEmojiBar.addEventListener('click', (e) => {
      const chip = e.target.closest('.emoji-chip');
      if (chip) {
        const emoji = chip.getAttribute('data-emoji');
        DOM.messageInput.value += ` ${emoji} `;
        DOM.messageInput.focus();
      }
    });

    // Search Toggle
    DOM.searchToggleBtn.addEventListener('click', () => {
      const isVisible = DOM.searchBarContainer.style.display !== 'none';
      DOM.searchBarContainer.style.display = isVisible ? 'none' : 'block';
      if (!isVisible) {
        DOM.searchInput.focus();
      } else {
        DOM.searchInput.value = '';
        state.searchQuery = '';
        renderMessages();
      }
    });

    // Date Filter Header Button & Banner Listeners (Memories Browser)
    if (DOM.dateFilterBtn) {
      DOM.dateFilterBtn.addEventListener('click', openDateFilterModal);
    }

    if (DOM.openDateModalFromBannerBtn) {
      DOM.openDateModalFromBannerBtn.addEventListener('click', openDateFilterModal);
    }

    if (DOM.clearDateFilterBtn) {
      DOM.clearDateFilterBtn.addEventListener('click', () => {
        filterByDate('all');
        showToast('تم إلغاء التصفية وعرض جميع الرسائل 💬', 'info');
      });
    }

    if (DOM.prevDayFilterBtn) {
      DOM.prevDayFilterBtn.addEventListener('click', () => navigateDayFilter('prev'));
    }

    if (DOM.nextDayFilterBtn) {
      DOM.nextDayFilterBtn.addEventListener('click', () => navigateDayFilter('next'));
    }

    // Date Filter Modal Handlers
    if (DOM.closeDateFilterModalBtn) {
      DOM.closeDateFilterModalBtn.addEventListener('click', () => {
        DOM.dateFilterModal.style.display = 'none';
      });
    }

    if (DOM.closeDateFilterFooterBtn) {
      DOM.closeDateFilterFooterBtn.addEventListener('click', () => {
        DOM.dateFilterModal.style.display = 'none';
      });
    }

    if (DOM.resetDateFilterModalBtn) {
      DOM.resetDateFilterModalBtn.addEventListener('click', () => {
        filterByDate('all');
        DOM.dateFilterModal.style.display = 'none';
        showToast('تم عرض جميع محادثات العائلة', 'info');
      });
    }

    if (DOM.applyDatePickerBtn && DOM.dateFilterInput) {
      DOM.applyDatePickerBtn.addEventListener('click', () => {
        const val = DOM.dateFilterInput.value;
        if (val) {
          filterByDate(val);
          DOM.dateFilterModal.style.display = 'none';
          const parts = val.split('-');
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          showToast(`تم عرض رسائل ${formatDateHeader(d)} 📅`, 'success');
        }
      });
    }

    if (DOM.dateFilterModal) {
      DOM.dateFilterModal.addEventListener('click', (e) => {
        if (e.target === DOM.dateFilterModal) {
          DOM.dateFilterModal.style.display = 'none';
        }
      });
    }

    // Quoted Reply Cancel Button
    if (DOM.cancelReplyBtn) {
      DOM.cancelReplyBtn.addEventListener('click', cancelReplyTo);
    }

    // Dismiss WhatsApp Floating Reaction Dock when clicking anywhere outside
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#activeReactionDock') && !e.target.closest('.react-btn')) {
        const activeDock = document.getElementById('activeReactionDock');
        if (activeDock) activeDock.remove();
      }
    });

    DOM.searchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value.trim();
      renderMessages();
    });

    DOM.clearSearchBtn.addEventListener('click', () => {
      DOM.searchInput.value = '';
      state.searchQuery = '';
      DOM.searchResultsCount.textContent = '';
      renderMessages();
    });

    // Chat Scrolling Navigation Handlers
    DOM.chatMain.addEventListener('scroll', updateScrollNavUI);

    if (DOM.scrollToTopBtn) {
      DOM.scrollToTopBtn.addEventListener('click', () => scrollToTop(true));
    }
    if (DOM.scrollStepUpBtn) {
      DOM.scrollStepUpBtn.addEventListener('click', () => scrollStep(-280));
    }
    if (DOM.scrollStepDownBtn) {
      DOM.scrollStepDownBtn.addEventListener('click', () => scrollStep(280));
    }
    if (DOM.scrollToBottomBtn) {
      DOM.scrollToBottomBtn.addEventListener('click', () => scrollToBottom(true));
    }

    // Keyboard Navigation for Quick Scrolling
    window.addEventListener('keydown', (e) => {
      const activeTag = document.activeElement ? document.activeElement.tagName.toLowerCase() : '';
      if (activeTag === 'input' || activeTag === 'textarea') return;

      if (e.key === 'PageUp') {
        e.preventDefault();
        scrollStep(-400);
      } else if (e.key === 'PageDown') {
        e.preventDefault();
        scrollStep(400);
      } else if (e.key === 'Home') {
        e.preventDefault();
        scrollToTop(true);
      } else if (e.key === 'End') {
        e.preventDefault();
        scrollToBottom(true);
      }
    });

    // Delete Modal Events
    if (DOM.deleteSafetyCheck) {
      DOM.deleteSafetyCheck.addEventListener('change', (e) => {
        if (DOM.confirmDeleteBtn) {
          DOM.confirmDeleteBtn.disabled = !e.target.checked;
        }
      });
    }

    DOM.confirmDeleteBtn.addEventListener('click', confirmDeleteMessage);
    
    const hideDeleteModal = () => {
      DOM.deleteModal.style.display = 'none';
      state.selectedDeleteId = null;
      if (DOM.deleteSafetyCheck) DOM.deleteSafetyCheck.checked = false;
      if (DOM.confirmDeleteBtn) DOM.confirmDeleteBtn.disabled = true;
    };

    DOM.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    if (DOM.closeDeleteModalBtn) {
      DOM.closeDeleteModalBtn.addEventListener('click', hideDeleteModal);
    }

    // Lightbox Modal
    DOM.closeLightboxBtn.addEventListener('click', () => {
      DOM.lightboxModal.style.display = 'none';
    });

    if (DOM.lightboxPrevBtn) {
      DOM.lightboxPrevBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        lightboxPrev();
      });
    }

    if (DOM.lightboxNextBtn) {
      DOM.lightboxNextBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        lightboxNext();
      });
    }

    // Keyboard Arrow navigation for Lightbox
    window.addEventListener('keydown', (e) => {
      if (DOM.lightboxModal && DOM.lightboxModal.style.display === 'flex') {
        if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
          e.preventDefault();
          if (e.key === 'ArrowRight') lightboxNext();
          else lightboxPrev();
        } else if (e.key === 'Escape') {
          DOM.lightboxModal.style.display = 'none';
        }
      }
    });

    // Pinned Announcements Listeners
    if (DOM.pinnedAnnouncementBtn) {
      DOM.pinnedAnnouncementBtn.addEventListener('click', openAnnouncementModal);
    }
    if (DOM.editAnnouncementBtn) {
      DOM.editAnnouncementBtn.addEventListener('click', openAnnouncementModal);
    }
    if (DOM.closeAnnouncementModalBtn) {
      DOM.closeAnnouncementModalBtn.addEventListener('click', () => {
        DOM.announcementModal.style.display = 'none';
      });
    }
    if (DOM.cancelAnnouncementBtn) {
      DOM.cancelAnnouncementBtn.addEventListener('click', () => {
        DOM.announcementModal.style.display = 'none';
      });
    }
    if (DOM.saveAnnouncementBtn) {
      DOM.saveAnnouncementBtn.addEventListener('click', savePinnedAnnouncement);
    }
    if (DOM.unpinAnnouncementBtn) {
      DOM.unpinAnnouncementBtn.addEventListener('click', unpinAnnouncement);
    }
    if (DOM.togglePinnedBannerBtn) {
      DOM.togglePinnedBannerBtn.addEventListener('click', () => {
        if (DOM.pinnedAnnouncementBanner) {
          DOM.pinnedAnnouncementBanner.classList.toggle('collapsed');
        }
      });
    }

    // Family Events & Calendar Listeners
    if (DOM.familyCalendarBtn) {
      DOM.familyCalendarBtn.addEventListener('click', () => {
        renderFamilyEventsList();
        DOM.eventsCalendarModal.style.display = 'flex';
      });
    }
    if (DOM.closeEventsModalBtn) {
      DOM.closeEventsModalBtn.addEventListener('click', () => {
        DOM.eventsCalendarModal.style.display = 'none';
      });
    }
    if (DOM.toggleAddEventFormBtn) {
      DOM.toggleAddEventFormBtn.addEventListener('click', () => {
        const isHidden = DOM.addEventFormCard.style.display === 'none' || !DOM.addEventFormCard.style.display;
        DOM.addEventFormCard.style.display = isHidden ? 'block' : 'none';
        if (isHidden && DOM.eventTitleInput) DOM.eventTitleInput.focus();
      });
    }
    if (DOM.cancelAddEventBtn) {
      DOM.cancelAddEventBtn.addEventListener('click', () => {
        DOM.addEventFormCard.style.display = 'none';
      });
    }
    if (DOM.saveNewEventBtn) {
      DOM.saveNewEventBtn.addEventListener('click', saveNewFamilyEvent);
    }

    // Delete Event Confirm Modal Listeners
    if (DOM.closeDeleteEventConfirmModalBtn) {
      DOM.closeDeleteEventConfirmModalBtn.addEventListener('click', closeDeleteEventConfirmModal);
    }
    if (DOM.cancelDeleteEventBtn) {
      DOM.cancelDeleteEventBtn.addEventListener('click', closeDeleteEventConfirmModal);
    }
    if (DOM.confirmDeleteEventActionBtn) {
      DOM.confirmDeleteEventActionBtn.addEventListener('click', () => {
        executeDeleteFamilyEvent();
      });
    }
    if (DOM.deleteEventConfirmModal) {
      DOM.deleteEventConfirmModal.addEventListener('click', (e) => {
        if (e.target === DOM.deleteEventConfirmModal) {
          closeDeleteEventConfirmModal();
        }
      });
    }

    // Family Polls Listeners
    if (DOM.createPollBtn) {
      DOM.createPollBtn.addEventListener('click', openPollCreateModal);
    }
    if (DOM.closePollModalBtn) {
      DOM.closePollModalBtn.addEventListener('click', () => {
        DOM.pollCreateModal.style.display = 'none';
      });
    }
    if (DOM.cancelPollBtn) {
      DOM.cancelPollBtn.addEventListener('click', () => {
        DOM.pollCreateModal.style.display = 'none';
      });
    }
    if (DOM.addPollOptionBtn) {
      DOM.addPollOptionBtn.addEventListener('click', addPollOptionInput);
    }
    if (DOM.submitPollBtn) {
      DOM.submitPollBtn.addEventListener('click', submitPoll);
    }

    // Family Albums & Memory Wall Listeners
    if (DOM.openAddMemoryModalBtn) {
      DOM.openAddMemoryModalBtn.addEventListener('click', () => {
        if (DOM.memoryCaptionInput) DOM.memoryCaptionInput.value = '';
        if (DOM.memoryPreviewImg) DOM.memoryPreviewImg.src = '';
        if (DOM.memoryDropzone) DOM.memoryDropzone.classList.remove('has-image');
        DOM.addMemoryModal.style.display = 'flex';
      });
    }
    if (DOM.closeAddMemoryModalBtn) {
      DOM.closeAddMemoryModalBtn.addEventListener('click', () => {
        DOM.addMemoryModal.style.display = 'none';
      });
    }
    if (DOM.cancelMemoryBtn) {
      DOM.cancelMemoryBtn.addEventListener('click', () => {
        DOM.addMemoryModal.style.display = 'none';
      });
    }
    if (DOM.saveMemoryBtn) {
      DOM.saveMemoryBtn.addEventListener('click', saveNewMemory);
    }
    if (DOM.memoryDropzone && DOM.memoryFileInput) {
      DOM.memoryDropzone.addEventListener('click', () => DOM.memoryFileInput.click());
    }
    if (DOM.memoryFileInput) {
      DOM.memoryFileInput.addEventListener('change', async (e) => {
        if (e.target.files && e.target.files[0]) {
          try {
            const dataUrl = await compressAndCropSquareImage(e.target.files[0], 800, 0.9);
            if (DOM.memoryPreviewImg) DOM.memoryPreviewImg.src = dataUrl;
            if (DOM.memoryDropzone) DOM.memoryDropzone.classList.add('has-image');
          } catch(err) {
            console.warn('Memory image processing failed:', err);
          }
        }
      });
    }
    if (DOM.albumFilterBar) {
      DOM.albumFilterBar.addEventListener('click', (e) => {
        const pill = e.target.closest('.album-filter-pill');
        if (pill) {
          const filter = pill.getAttribute('data-filter') || 'all';
          renderFamilyAlbums(filter);
        }
      });
    }

    // Media Gallery Modal
    DOM.mediaGalleryBtn.addEventListener('click', () => openMediaGallery('albums'));
    DOM.closeGalleryModalBtn.addEventListener('click', () => {
      DOM.mediaGalleryModal.style.display = 'none';
    });

    DOM.mediaGalleryModal.querySelectorAll('.gallery-tab').forEach(tab => {
      tab.addEventListener('click', () => renderGalleryTab(tab.getAttribute('data-tab')));
    });

    // Settings Modal
    DOM.settingsBtn.addEventListener('click', () => {
      DOM.settingsModal.style.display = 'flex';
    });

    DOM.closeSettingsModalBtn.addEventListener('click', () => {
      DOM.settingsModal.style.display = 'none';
    });

    DOM.settingsChangeNameBtn.addEventListener('click', () => {
      DOM.settingsModal.style.display = 'none';
      showUserSelectionModal(true);
    });

    DOM.saveFbConfigBtn.addEventListener('click', () => {
      const newConfig = {
        apiKey: DOM.fbApiKey.value.trim(),
        databaseURL: DOM.fbDbUrl.value.trim(),
        storageBucket: DOM.fbStorageBucket.value.trim(),
        projectId: DOM.fbProjectId.value.trim()
      };
      localStorage.setItem(STORAGE_KEYS.FB_CONFIG, JSON.stringify(newConfig));
      alert('تم حفظ إعدادات Firebase بنجاح! سيتم إعادة تحميل الاتصال.');
      window.location.reload();
    });

    DOM.resetFbConfigBtn.addEventListener('click', () => {
      localStorage.removeItem(STORAGE_KEYS.FB_CONFIG);
      alert('تمت استعادة الإعدادات الافتراضية.');
      window.location.reload();
    });

    DOM.soundToggle.addEventListener('change', (e) => {
      state.soundEnabled = e.target.checked;
      localStorage.setItem(STORAGE_KEYS.SOUND_ENABLED, state.soundEnabled ? '1' : '0');
    });

    // Load sound preference
    const soundPref = localStorage.getItem(STORAGE_KEYS.SOUND_ENABLED);
    if (soundPref !== null) {
      state.soundEnabled = soundPref === '1';
      DOM.soundToggle.checked = state.soundEnabled;
    }

    // PWA & Desktop Shortcut Functions
    function openShortcutModal(preselectedTab) {
      if (!DOM.shortcutModal) return;

      const ua = navigator.userAgent || '';
      const isIOS = /iPad|iPhone|iPod/.test(ua) && !window.MSStream;
      const isAndroid = /Android/.test(ua);
      const isMobile = isIOS || isAndroid;

      // Auto-detect device if no tab specified
      let targetTab = preselectedTab;
      if (!targetTab) {
        if (isIOS) {
          targetTab = 'tab-ios';
        } else if (isAndroid) {
          targetTab = 'tab-android';
        } else {
          targetTab = 'tab-pc';
        }
      }

      // Switch active tab
      if (DOM.shortcutDeviceTabs) {
        DOM.shortcutDeviceTabs.querySelectorAll('.device-tab').forEach(tab => {
          if (tab.getAttribute('data-tab') === targetTab) {
            tab.classList.add('active');
          } else {
            tab.classList.remove('active');
          }
        });
      }

      if (DOM.shortcutModal) {
        DOM.shortcutModal.querySelectorAll('.device-tab-panel').forEach(panel => {
          if (panel.id === targetTab) {
            panel.classList.add('active');
          } else {
            panel.classList.remove('active');
          }
        });
      }

      // Hide or show desktop shortcut download on mobile vs PC
      if (DOM.downloadDesktopShortcutBtn) {
        DOM.downloadDesktopShortcutBtn.style.display = isMobile ? 'none' : 'inline-flex';
      }

      // If native prompt is available or mobile device, show direct install button
      if (DOM.triggerNativeInstallBtn) {
        DOM.triggerNativeInstallBtn.style.display = 'inline-flex';
      }

      DOM.shortcutModal.style.display = 'flex';
    }

    function closeShortcutModal() {
      if (DOM.shortcutModal) DOM.shortcutModal.style.display = 'none';
    }

    function downloadDesktopShortcut() {
      const ua = navigator.userAgent || '';
      const isMobile = /iPad|iPhone|iPod|Android/.test(ua);
      if (isMobile) {
        showToast('على الهاتف: استخدم زر «إضافة إلى الشاشة الرئيسية» من قائمة المتصفح لتظهر أيقونة التطبيق بشكل سليم 📱', 'info', 5000);
        return;
      }

      try {
        const currentUrl = window.location.origin + '/';
        const shortcutContent = `[InternetShortcut]\r\nURL=${currentUrl}\r\nIconIndex=0\r\n`;
        const blob = new Blob([shortcutContent], { type: 'application/internet-shortcut' });
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(blob);
        downloadLink.download = 'عائلة يحيي صبيح.url';
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        URL.revokeObjectURL(downloadLink.href);

        showToast('تم تنزيل ملف اختصار سطح المكتب بنجاح! اسحبه الآن لسطح المكتب 💻', 'success', 4000);
      } catch (err) {
        console.warn('Desktop shortcut download error:', err);
        showToast('تعذر التنزيل التلقائي، يمكنك اتباع خطوات التثبيت من المتصفح', 'warning');
      }
    }

    // PWA Install Prompt Listener
    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      state.deferredInstallPrompt = e;
      if (DOM.pwaBanner) DOM.pwaBanner.style.display = 'flex';
    });

    const triggerPWAInstall = async () => {
      if (state.deferredInstallPrompt) {
        try {
          state.deferredInstallPrompt.prompt();
          const { outcome } = await state.deferredInstallPrompt.userChoice;
          if (outcome === 'accepted') {
            if (DOM.pwaBanner) DOM.pwaBanner.style.display = 'none';
            showToast('تم تثبيت تطبيق عائلة يحيي صبيح بنجاح على هاتفك 🎉', 'success', 4000);
            closeShortcutModal();
          }
          state.deferredInstallPrompt = null;
        } catch (err) {
          console.warn('PWA prompt error:', err);
        }
      } else {
        const ua = navigator.userAgent || '';
        if (/iPad|iPhone|iPod/.test(ua)) {
          showToast('على الآيفون: اضغط زر المشاركة (Share ⬆️) ثم «إضافة إلى الصفحة الرئيسية» 📱', 'info', 5000);
        } else if (/Android/.test(ua)) {
          showToast('على الأندرويد: اضغط النقاط الثلاث (⋮) في أعلى المتصفح ثم «إضافة إلى الشاشة الرئيسية» 📲', 'info', 5000);
        } else {
          showToast('من متصفح الكمبيوتر: اضغط علامة التثبيت في شريط العنوان بالأعلى 💻', 'info', 4000);
        }
      }
    };

    // Header & Modal Shortcut Buttons
    if (DOM.openShortcutModalBtn) {
      DOM.openShortcutModalBtn.addEventListener('click', () => openShortcutModal());
    }
    if (DOM.settingsOpenShortcutBtn) {
      DOM.settingsOpenShortcutBtn.addEventListener('click', () => {
        if (DOM.settingsModal) DOM.settingsModal.style.display = 'none';
        openShortcutModal();
      });
    }
    if (DOM.closeShortcutModalBtn) {
      DOM.closeShortcutModalBtn.addEventListener('click', closeShortcutModal);
    }
    if (DOM.closeShortcutModalFooterBtn) {
      DOM.closeShortcutModalFooterBtn.addEventListener('click', closeShortcutModal);
    }
    if (DOM.triggerNativeInstallBtn) {
      DOM.triggerNativeInstallBtn.addEventListener('click', triggerPWAInstall);
    }
    if (DOM.downloadDesktopShortcutBtn) {
      DOM.downloadDesktopShortcutBtn.addEventListener('click', downloadDesktopShortcut);
    }

    // Device Tabs Switching
    if (DOM.shortcutDeviceTabs) {
      DOM.shortcutDeviceTabs.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.device-tab');
        if (tabBtn) {
          const tabId = tabBtn.getAttribute('data-tab');
          openShortcutModal(tabId);
        }
      });
    }

    // Copy App Link to Share with Family
    if (DOM.copyAppShareLinkBtn) {
      DOM.copyAppShareLinkBtn.addEventListener('click', async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          showToast('تم نسخ رابط التطبيق بنجاح! يمكنك الآن إرساله للعائلة 📋', 'success');
        } catch (err) {
          const input = document.createElement('input');
          input.value = window.location.href;
          document.body.appendChild(input);
          input.select();
          document.execCommand('copy');
          document.body.removeChild(input);
          showToast('تم نسخ رابط التطبيق بنجاح 📋', 'success');
        }
      });
    }

    if (DOM.pwaBannerInstallBtn) DOM.pwaBannerInstallBtn.addEventListener('click', () => openShortcutModal());
    if (DOM.pwaBannerDismissBtn) {
      DOM.pwaBannerDismissBtn.addEventListener('click', () => {
        if (DOM.pwaBanner) DOM.pwaBanner.style.display = 'none';
      });
    }

    // Drag & Drop media file onto chat area
    DOM.chatMain.addEventListener('dragover', (e) => {
      e.preventDefault();
      DOM.chatMain.style.backgroundColor = 'rgba(2, 132, 199, 0.08)';
    });

    DOM.chatMain.addEventListener('dragleave', () => {
      DOM.chatMain.style.backgroundColor = '';
    });

    DOM.chatMain.addEventListener('drop', (e) => {
      e.preventDefault();
      DOM.chatMain.style.backgroundColor = '';
      if (e.dataTransfer.files && e.dataTransfer.files[0]) {
        handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // Cross-tab and cross-window sync listener
    window.addEventListener('storage', (e) => {
      if (e.key === STORAGE_KEYS.MESSAGES_CACHE || e.key === STORAGE_KEYS.SYNC_ACTION) {
        loadCachedMessages();
        renderMessages();
      } else if (e.key === STORAGE_KEYS.USER_NAME) {
        initUserSession();
      } else if (e.key === STORAGE_KEYS.FAMILY_MEMBERS) {
        loadFamilyMembers();
      } else if (e.key === STORAGE_KEYS.PINNED_ANNOUNCEMENT) {
        initPinnedAnnouncements();
      } else if (e.key === STORAGE_KEYS.FAMILY_EVENTS) {
        initFamilyEvents();
      } else if (e.key === STORAGE_KEYS.FAMILY_MEMORIES) {
        initFamilyMemories();
      }
    });
  }

  // --------------------------------------------------------------------------
  // 17. PWA Service Worker Registration
  // --------------------------------------------------------------------------
  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js', { scope: '/' })
          .then((reg) => {
            console.log('Service Worker registered successfully:', reg.scope);
            // Check for SW updates
            if (reg.update) {
              reg.update();
            }
          })
          .catch((err) => {
            // Fallback to relative registration if root scope is restricted
            navigator.serviceWorker.register('./sw.js')
              .catch((swErr) => console.warn('Service Worker fallback warning:', swErr));
          });
      });
    }
  }

  // --------------------------------------------------------------------------
  // 18. Application Bootstrap
  // --------------------------------------------------------------------------
  let isBootstrapped = false;
  function bootstrap() {
    if (isBootstrapped) return;
    isBootstrapped = true;

    try {
      initUserSession();
      initFirebase();
      initPinnedAnnouncements();
      initFamilyEvents();
      initFamilyMemories();
      setupEventListeners();
      registerServiceWorker();

      // Check URL query params for shortcut direct view
      const urlParams = new URLSearchParams(window.location.search);
      const viewParam = urlParams.get('view');
      if (viewParam === 'events') {
        setTimeout(() => {
          if (DOM.eventsCalendarModal) {
            renderFamilyEventsList();
            DOM.eventsCalendarModal.style.display = 'flex';
          }
        }, 500);
      } else if (viewParam === 'gallery') {
        setTimeout(() => {
          if (DOM.mediaGalleryModal) openMediaGallery('albums');
        }, 500);
      }

      // Scroll to bottom after initial load
      setTimeout(() => {
        scrollToBottom(false);
      }, 300);
    } catch (e) {
      console.error('App bootstrap error:', e);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

})();
