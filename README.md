# Hidden Text Revealer - Chrome Extension

A Chrome extension that detects and highlights text hidden on web pages using various techniques.

## Features

This extension reveals text that's hidden using:
- **Tiny font sizes** (< 2px)
- **Color matching** (text color same as background)
- **Transparency** (opacity near 0)
- **CSS visibility: hidden**
- **CSS display: none**
- **Text-indent** hiding (negative values)
- **Off-screen positioning**
- **CSS clipping**

## Installation

### Method 1: Developer Mode (Recommended for testing)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in top-right corner)
3. Click **Load unpacked**
4. Select the `hidden-text-revealer` folder
5. The extension is now installed!

### Method 2: Create a .crx file (for distribution)

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Pack extension**
4. Select the extension directory
5. Click **Pack Extension** button
6. Share the generated .crx file

## Usage

1. Navigate to any webpage
2. Click the extension icon in your Chrome toolbar
3. Click **"Reveal Hidden Text"** button
4. Hidden text will be highlighted in yellow with pink borders
5. Each revealed element shows why it was considered hidden
6. Click **"Hide Revealed Text"** to return to normal view

## How It Works

The extension:
1. Scans all elements on the page
2. Checks computed styles for hiding techniques
3. Compares text color with background color
4. Detects positioning and visibility tricks
5. Highlights found elements with clear styling
6. Shows detection reason for each element

## Use Cases

- **SEO Analysis**: Detect hidden text used for search engine manipulation
- **Accessibility Testing**: Find text that might be hidden from screen readers
- **Security Research**: Identify potentially malicious hidden content
- **Web Development**: Debug CSS issues causing unintended hiding
- **Content Verification**: Ensure all text is visible to users

## Files Structure

```
hidden-text-revealer/
├── manifest.json       # Extension configuration
├── content.js         # Main detection logic
├── content.css        # Styling for revealed text
├── popup.html         # Extension popup interface
├── popup.js           # Popup functionality
├── icon16.png         # Extension icon (16x16)
├── icon48.png         # Extension icon (48x48)
├── icon128.png        # Extension icon (128x128)
└── README.md          # This file
```

## Technical Details

- **Manifest Version**: 3 (latest Chrome extension format)
- **Permissions**: activeTab, scripting
- **Content Scripts**: Runs on all URLs
- **Color Similarity**: Uses RGB difference threshold of 30

## Customization

You can modify the detection thresholds in `content.js`:
- Font size threshold: Change `fontSize < 2`
- Color similarity: Adjust RGB difference values (currently 30)
- Opacity threshold: Modify `opacity < 0.1`

You can also customize the highlighting style in `content.css`:
- Change highlight colors
- Adjust border styles
- Modify label appearance

## Privacy

This extension:
- ✅ Runs only on pages you visit
- ✅ Does NOT collect or send any data
- ✅ Works completely offline
- ✅ Does NOT track your browsing

## Browser Compatibility

- Chrome (Manifest V3)
- Microsoft Edge (Chromium-based)
- Brave Browser
- Other Chromium-based browsers

## Known Limitations

- Cannot detect text hidden by JavaScript after page load
- May not catch very sophisticated hiding techniques
- Some dynamic content might need page refresh
- Does not detect images with hidden text

## Troubleshooting

**Extension doesn't work:**
- Refresh the page after installing
- Check that the extension is enabled
- Try disabling and re-enabling the extension

**Some hidden text not detected:**
- The hiding technique might be too sophisticated
- Try refreshing the page
- Check browser console for errors

## Future Enhancements

Potential features to add:
- [ ] Export list of hidden text
- [ ] Whitelist certain domains
- [ ] Custom detection rules
- [ ] Statistics dashboard
- [ ] Keyboard shortcuts
- [ ] Detection sensitivity settings

## License

Free to use and modify for personal and commercial purposes.

## Contributing

Feel free to fork and improve! Suggestions:
- Add more detection techniques
- Improve color matching algorithm
- Add internationalization
- Create better icons
- Add unit tests

## Support

If you find bugs or have suggestions, feel free to modify the code or create your own version!
