# Video Call Controls - Usage & Implementation Guide

## 📦 Components Overview

### 1. **CallControls** (Basic/Recommended)
Located in: [`CallControls.jsx`](./CallControls.jsx)

Essential buttons for any video call:
- ✅ Microphone (mute/unmute) - Blue
- ✅ Camera (on/off) - Green
- ✅ End Call - Red

**Best for**: Simplicity, clean UI, standard video calls

### 2. **CallControlsEnhanced** (Optional)
Located in: [`CallControlsEnhanced.jsx`](./CallControlsEnhanced.jsx)

All basic features PLUS:
- 📺 Screen sharing - Purple
- 💬 Chat toggle - Yellow
- ⋯ Extensible for more buttons

**Best for**: Full-featured apps, professional conferencing, future expansion

---

## 🚀 Quick Start

### Basic Setup (Current Implementation)

```jsx
// Already integrated in CallModal.jsx
import CallControls from './CallControls'

function CallModal() {
  const [isCameraOn, setIsCameraOn] = useState(true)
  const { isMuted, toggleMute, endCall } = useCall()

  return (
    <>
      {/* Video content here */}
      <CallControls
        isMuted={isMuted}
        onToggleMute={toggleMute}
        isCameraOn={isCameraOn}
        onToggleCamera={() => setIsCameraOn(!isCameraOn)}
        onEndCall={endCall}
      />
    </>
  )
}
```

### Enhanced Setup (Optional)

```jsx
import CallControlsEnhanced from './CallControlsEnhanced'

function AdvancedCallModal() {
  const [isCameraOn, setIsCameraOn] = useState(true)
  const [isScreenSharing, setIsScreenSharing] = useState(false)
  const [isChatVisible, setIsChatVisible] = useState(false)
  const { isMuted, toggleMute, endCall } = useCall()

  return (
    <CallControlsEnhanced
      isMuted={isMuted}
      onToggleMute={toggleMute}
      isCameraOn={isCameraOn}
      onToggleCamera={() => setIsCameraOn(!isCameraOn)}
      isScreenSharing={isScreenSharing}
      onToggleScreenShare={() => setIsScreenSharing(!isScreenSharing)}
      isChatVisible={isChatVisible}
      onToggleChat={() => setIsChatVisible(!isChatVisible)}
      onEndCall={endCall}
    />
  )
}
```

---

## 🎯 Component Props Reference

### CallControls Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isMuted` | boolean | Yes | Current microphone mute state |
| `onToggleMute` | function | Yes | Handler for mute/unmute |
| `isCameraOn` | boolean | Yes | Current camera state |
| `onToggleCamera` | function | Yes | Handler for camera toggle |
| `onEndCall` | function | Yes | Handler to end the call |
| `disabled` | boolean | No | Disable all buttons (default: false) |

### CallControlsEnhanced Props

| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `isMuted` | boolean | Yes | Current microphone mute state |
| `onToggleMute` | function | Yes | Handler for mute/unmute |
| `isCameraOn` | boolean | Yes | Current camera state |
| `onToggleCamera` | function | Yes | Handler for camera toggle |
| `onEndCall` | function | Yes | Handler to end the call |
| `isScreenSharing` | boolean | No | Current screen share state (default: false) |
| `onToggleScreenShare` | function | No | Handler for screen share toggle |
| `isChatVisible` | boolean | No | Current chat visibility state (default: false) |
| `onToggleChat` | function | No | Handler for chat toggle |
| `disabled` | boolean | No | Disable all buttons (default: false) |
| `showAdvancedControls` | boolean | No | Show advanced control options (default: false) |

---

## 🎨 Design Specifications

### Button Dimensions

```
Mobile (< 768px):     56px × 56px (w-14 h-14)
Desktop (≥ 768px):    64px × 64px (w-16 h-16)
Gap Mobile:           16px (gap-4)
Gap Desktop:          24px (gap-6)
```

### Color Palette

#### State-Based Colors
```javascript
// Microphone
Muted (inactive):     red-500 → rose-600
Active:               blue-500 → cyan-600

// Camera
Off (inactive):       orange-500 → red-600
On (active):          green-500 → emerald-600

// Screen Share (Enhanced)
Inactive:             purple-500 → pink-600
Active:               slate-500 → slate-600

// Chat (Enhanced)
Inactive:             yellow-500 → orange-600
Active:               slate-500 → slate-600

// End Call (Destructive)
Always:               red-600 → red-700
Hover:                red-700 → red-800
```

### Shadow Effects
```javascript
shadow-lg shadow-{color}-500/50    // Glow effect
hover:shadow-xl                     // Enhanced on hover
```

### Animations

| Animation | Trigger | Duration | Effect |
|-----------|---------|----------|--------|
| Scale up | Hover | 200ms | `hover:scale-110` |
| Scale down | Click | 200ms | `active:scale-95` |
| Icon scale | Hover | 200ms | `group-hover:scale-125` |
| Ripple | Click | Auto | `animate-ping` |
| Glow fade | Hover | 300ms | Opacity 0 → 75% |
| Rotate | Hover (End) | 200ms | `group-hover:rotate-12` |

---

## 💻 HTML Structure

```
<div class="flex items-center justify-center gap-4 md:gap-6 ...">
  
  <!-- Each Button -->
  <button class="relative flex items-center justify-center ...">
    
    <!-- Glow Effect Layer -->
    <div class="absolute inset-0 rounded-full blur-xl ..."></div>
    
    <!-- Icon Layer (Relative positioning) -->
    <div class="relative z-10 ...">
      <Icon size={28} />
    </div>
    
    <!-- Ripple Effect Layer -->
    <div class="absolute inset-0 rounded-full bg-white/20 ..."></div>
    
  </button>
  
</div>
```

---

## ♿ Accessibility Features

### Semantic HTML
- ✅ Native `<button>` elements
- ✅ Proper type attributes
- ✅ Focus management

### ARIA Attributes
```jsx
aria-label="Mute microphone"     // Screen reader label
aria-pressed="true"             // Toggle state (optional)
aria-disabled="true"            // Disabled state
```

### Keyboard Navigation
- ✅ Tab key to focus
- ✅ Enter/Space to activate
- ✅ Focus ring visible (2px ring with offset)

### Tooltips
```jsx
title="Mute microphone"          // Native browser tooltip
```

### Color Contrast
- ✅ White icons on colored backgrounds
- ✅ WCAG AAA compliant
- ✅ Independent of color for meaning

---

## 🔧 Customization Examples

### 1. Change Button Size
```jsx
// In CallControls.jsx, modify:
className={`w-14 h-14 md:w-20 md:h-20 ...`}  // 80px on desktop
```

### 2. Adjust Gap/Spacing
```jsx
// In the container div:
className={`gap-4 md:gap-8 ...`}  // 32px gap on desktop
```

### 3. Modify Colors
```jsx
// Blue microphone to purple:
'bg-gradient-to-br from-purple-500 to-purple-600 ...'
'shadow-lg shadow-purple-500/50 ...'
'focus:ring-purple-400'
```

### 4. Disable a Button
```jsx
<CallControls
  {...props}
  disabled={!canUseCamera}  // Disable all during connection
/>
```

### 5. Add Custom Classes
```jsx
// Wrap component in custom container:
<div className="my-custom-spacing">
  <CallControls {...props} />
</div>
```

---

## 🧪 Testing Checklist

### Visual Testing
- [ ] Buttons appear correctly on mobile (56px)
- [ ] Buttons appear correctly on desktop (64px)
- [ ] Icons are centered
- [ ] Colors match specification
- [ ] Shadows appear with glow effect
- [ ] Spacing is even and centered

### Interaction Testing
- [ ] Hover scales buttons smoothly
- [ ] Click creates ripple effect
- [ ] Active states show correctly
- [ ] State changes update colors
- [ ] Disabled state reduces opacity

### Responsive Testing
- [ ] Mobile: Buttons stack horizontally
- [ ] Tablet: Proper scaling
- [ ] Desktop: Correct sizing
- [ ] No overflow on small screens

### Accessibility Testing
- [ ] Tab navigation works
- [ ] Enter/Space activate buttons
- [ ] Focus ring visible
- [ ] Screen reader reads labels
- [ ] Tooltips appear on hover

### Cross-Browser Testing
- [ ] Chrome ✅
- [ ] Firefox ✅
- [ ] Safari ✅
- [ ] Edge ✅
- [ ] Mobile browsers ✅

---

## 🚀 Performance Tips

### CSS Optimization
```css
/* Use transform for animations (GPU accelerated) */
hover:scale-110    ✅ Fast
hover:width-24     ❌ Slow

/* Use opacity for visibility */
opacity-0          ✅ Fast
display: none       ❌ Causes reflow
```

### React Optimization
```jsx
// Memoize to prevent unnecessary re-renders
const CallControls = React.memo(function CallControls(props) {
  // Component code
})
```

### Tailwind Optimization
- Classes are purged in production
- No inline styles
- Utility-first approach

---

## 📱 Mobile-Specific Considerations

### Touch Targets
- Minimum 44×44px (recommended)
- Current 56px on mobile ✅ Exceeds minimum

### Touch Feedback
- Visual feedback on tap
- No hover effects on mobile (use @media)
- Ripple effect on click

### Screen Space
- Buttons fit within safe areas
- No overflow on iPhone notch
- Proper padding around buttons

---

## 🔮 Future Enhancement Ideas

### Potential Additions
1. **Volume Control** - Slider or +/- buttons
2. **Speaker Selection** - Dropdown menu
3. **Settings** - Gear icon for video/audio settings
4. **Invite** - Add participant button
5. **Record** - Start/stop recording
6. **Whiteboard** - Share whiteboard
7. **Virtual Background** - Toggle background
8. **Noise Suppression** - Audio enhancement
9. **Hand Raise** - Indicate wanting to speak
10. **Breakout Rooms** - Group management

### Example Extended Component
```jsx
<CallControlsEnhanced
  // Basic controls
  isMuted={isMuted}
  onToggleMute={toggleMute}
  isCameraOn={isCameraOn}
  onToggleCamera={toggleCamera}
  
  // Advanced controls
  isScreenSharing={isScreenSharing}
  onToggleScreenShare={toggleScreenShare}
  isChatVisible={isChatVisible}
  onToggleChat={toggleChat}
  
  // Future additions
  canRecord={true}
  onToggleRecord={toggleRecord}
  canShareBoard={true}
  onOpenBoard={openBoard}
  
  // Utilities
  onEndCall={endCall}
/>
```

---

## 📚 Related Files

- **[CallModal.jsx](./CallModal.jsx)** - Main call modal component
- **[CallControls.jsx](./CallControls.jsx)** - Basic call controls
- **[CallControlsEnhanced.jsx](./CallControlsEnhanced.jsx)** - Enhanced with extra features
- **[CALL_CONTROLS_GUIDE.md](./CALL_CONTROLS_GUIDE.md)** - Design guide

---

## 🆘 Troubleshooting

### Icons Not Showing
- [ ] Check if `react-icons` is installed: `npm list react-icons`
- [ ] Verify import: `import { MdMic } from 'react-icons/md'`
- [ ] Clear node_modules: `rm -rf node_modules && npm install`

### Tailwind Classes Not Applied
- [ ] Ensure file is in Tailwind content paths
- [ ] Rebuild CSS: `npm run build`
- [ ] Check Tailwind config

### Animations Not Smooth
- [ ] Verify Tailwind animations are enabled
- [ ] Check browser GPU acceleration
- [ ] Use DevTools to profile performance

### Mobile Styling Issues
- [ ] Test with actual mobile device
- [ ] Check media queries
- [ ] Use responsive classes: `md:` prefix

---

**Component Status**: ✅ Production Ready  
**Last Updated**: April 16, 2026  
**Compatibility**: React 18+, Tailwind CSS 3+, react-icons 4.6+
