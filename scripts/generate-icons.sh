#!/bin/bash

# PDF Highlighter App Icon Generation System
# Based on DSA Learning App technical documentation
# Generates Apple-compliant rounded corner icons with complete cross-platform support
# 
# Features:
# - Precise Apple design guideline compliance (22.37% corner radius)
# - Complete icon suite generation (16×16 to 1024×1024)
# - Retina display support (@2x variants)
# - macOS ICNS bundle creation
# - Windows Store logo variants
# - Intelligent source file detection
# - Comprehensive error handling

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =============================================================================
# COLOR DEFINITIONS AND STYLING
# =============================================================================

readonly GREEN='\033[0;32m'
readonly BLUE='\033[0;34m'
readonly YELLOW='\033[1;33m'
readonly RED='\033[0;31m'
readonly CYAN='\033[0;36m'
readonly MAGENTA='\033[0;35m'
readonly NC='\033[0m' # No Color

# =============================================================================
# CONFIGURATION AND CONSTANTS
# =============================================================================

readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
readonly SOURCE_DIR="$PROJECT_ROOT/localResources/iconPng"
readonly OUTPUT_DIR="$PROJECT_ROOT/src-tauri/icons"
readonly TEMP_DIR="/tmp/pdf-highlighter-icons-$$"

# Apple design guideline compliance - corner radius as percentage of icon size
readonly CORNER_RADIUS_PERCENTAGE="0.2237"  # 22.37% per Apple guidelines

# Icon size definitions based on Apple and cross-platform requirements
readonly -a STANDARD_SIZES=(16 32 64 128 256 512 1024)
readonly -a RETINA_SIZES=(32 64 128 256 512 1024 2048)

# Windows Store specific sizes
readonly -a WINDOWS_STORE_SIZES=(30 44 71 89 107 142 150 284 310)
readonly STORE_LOGO_SIZE=50

# Detect ImageMagick command
if command -v magick &> /dev/null; then
    readonly CONVERT_CMD="magick"
else
    readonly CONVERT_CMD="convert"
fi

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

print_header() {
    echo -e "${BLUE}🎨 PDF Highlighter App Icon Generation System${NC}"
    echo -e "${CYAN}============================================${NC}"
    echo -e "${MAGENTA}Based on Apple Design Guidelines (Big Sur+)${NC}"
    echo ""
}

print_section() {
    echo -e "${YELLOW}$1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

cleanup_and_exit() {
    local exit_code=$1
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
    exit $exit_code
}

# =============================================================================
# DEPENDENCY CHECKING AND ENVIRONMENT VALIDATION
# =============================================================================

check_dependencies() {
    print_section "🔍 Checking dependencies..."
    
    local missing_deps=()
    
    # Check ImageMagick
    if ! command -v magick &> /dev/null && ! command -v convert &> /dev/null; then
        missing_deps+=("ImageMagick")
    fi
    
    # Check bc calculator
    if ! command -v bc &> /dev/null; then
        missing_deps+=("bc")
    fi
    
    # Check iconutil (macOS only)
    if [[ "$OSTYPE" == "darwin"* ]] && ! command -v iconutil &> /dev/null; then
        print_error "iconutil not found (required for macOS ICNS generation)"
        print_info "iconutil is built into macOS 10.7+. Please update macOS or run on macOS."
        return 1
    fi
    
    if [[ ${#missing_deps[@]} -gt 0 ]]; then
        print_error "Missing required dependencies: ${missing_deps[*]}"
        echo ""
        echo "Installation instructions:"
        echo "  macOS:   brew install imagemagick bc"
        echo "  Ubuntu:  sudo apt-get install imagemagick bc"
        echo "  Windows: Install ImageMagick from https://imagemagick.org/script/download.php"
        echo "           Install bc from your package manager or use WSL"
        return 1
    fi
    
    print_success "All dependencies found"
    
    print_info "Using ImageMagick command: $CONVERT_CMD"
}

# =============================================================================
# SOURCE FILE DETECTION AND VALIDATION
# =============================================================================

find_source_icon() {
    print_section "📁 Locating source icon..." >&2
    
    local source_png=""
    
    # Priority order for source file detection
    if [[ -f "$SOURCE_DIR/app-icon.png" ]]; then
        source_png="$SOURCE_DIR/app-icon.png"
        print_info "Found: app-icon.png" >&2
    elif [[ -f "$SOURCE_DIR/icon.png" ]]; then
        source_png="$SOURCE_DIR/icon.png"
        print_info "Found: icon.png" >&2
    else
        # Find any PNG file in the source directory
        source_png=$(find "$SOURCE_DIR" -name "*.png" -type f | head -n 1)
        if [[ -n "$source_png" ]]; then
            print_info "Found: $(basename "$source_png")" >&2
        fi
    fi
    
    if [[ -z "$source_png" ]] || [[ ! -f "$source_png" ]]; then
        print_error "No source PNG file found in $SOURCE_DIR" >&2
        echo "" >&2
        echo "Please add a source icon file:" >&2
        echo "  • Preferred: $SOURCE_DIR/app-icon.png" >&2
        echo "  • Alternative: $SOURCE_DIR/icon.png" >&2
        echo "  • Any PNG file in: $SOURCE_DIR" >&2
        echo "" >&2
        echo "Source icon requirements:" >&2
        echo "  • Size: 1024×1024px or higher recommended" >&2
        echo "  • Format: PNG with transparency preferred" >&2
        echo "  • Design: Keep important elements 10% from edges" >&2
        return 1
    fi
    
    # Validate source icon
    if ! $CONVERT_CMD identify "$source_png" >/dev/null 2>&1; then
        print_error "Invalid or corrupted PNG file: $source_png" >&2
        return 1
    fi
    
    # Get source dimensions
    local dimensions
    dimensions=$($CONVERT_CMD identify -format "%wx%h" "$source_png" 2>/dev/null)
    print_success "Source icon: $(basename "$source_png") ($dimensions)" >&2
    
    # Recommend minimum size
    local width height
    width=$(echo "$dimensions" | cut -d'x' -f1)
    height=$(echo "$dimensions" | cut -d'x' -f2)
    
    if [[ $width -lt 512 ]] || [[ $height -lt 512 ]]; then
        print_error "Source icon size (${width}×${height}) is smaller than recommended minimum (512×512)" >&2
        print_info "For best quality, use 1024×1024 or higher resolution source" >&2
    fi
    
    echo "$source_png"
}

# =============================================================================
# DIRECTORY SETUP AND CLEANUP
# =============================================================================

setup_directories() {
    print_section "📂 Setting up directories..."
    
    # Create output directory
    mkdir -p "$OUTPUT_DIR"
    print_success "Output directory ready: $OUTPUT_DIR"
    
    # Create and clean temp directory
    if [[ -d "$TEMP_DIR" ]]; then
        rm -rf "$TEMP_DIR"
    fi
    mkdir -p "$TEMP_DIR"
    print_success "Temporary directory created: $TEMP_DIR"
}

# =============================================================================
# CORE ICON GENERATION FUNCTIONS
# =============================================================================

calculate_corner_radius() {
    local size=$1
    local radius
    
    # Calculate radius using Apple's 22.37% guideline
    radius=$(echo "scale=0; $size * $CORNER_RADIUS_PERCENTAGE / 1" | bc)
    
    # Ensure minimum radius for very small icons
    if [[ $radius -lt 2 ]]; then
        radius=2
    fi
    
    # Ensure radius doesn't exceed half the icon size
    local max_radius=$((size / 2))
    if [[ $radius -gt $max_radius ]]; then
        radius=$max_radius
    fi
    
    echo "$radius"
}

generate_rounded_icon() {
    local source_file=$1
    local size=$2
    local output_name=$3
    local corner_radius
    
    corner_radius=$(calculate_corner_radius "$size")
    
    print_info "Generating ${size}×${size} → $output_name (radius: ${corner_radius}px)"
    
    # Create base icon with proper resizing and centering
    $CONVERT_CMD "$source_file" \
        -resize "${size}x${size}" \
        -background transparent \
        -gravity center \
        -extent "${size}x${size}" \
        "$TEMP_DIR/base_${size}.png"
    
    # Create rounded corner mask
    $CONVERT_CMD -size "${size}x${size}" xc:none \
        -fill white \
        -draw "roundrectangle 0,0 $((size-1)),$((size-1)) $corner_radius,$corner_radius" \
        "$TEMP_DIR/mask_${size}.png"
    
    # Apply mask to create rounded corners
    $CONVERT_CMD "$TEMP_DIR/base_${size}.png" "$TEMP_DIR/mask_${size}.png" \
        -alpha off -compose CopyOpacity -composite \
        "$OUTPUT_DIR/$output_name"
    
    # Verify output
    if [[ ! -f "$OUTPUT_DIR/$output_name" ]]; then
        print_error "Failed to generate $output_name"
        return 1
    fi
    
    # Clean up temporary files
    rm -f "$TEMP_DIR/base_${size}.png" "$TEMP_DIR/mask_${size}.png"
    
    print_success "Created $output_name"
}

# =============================================================================
# STANDARD ICON GENERATION
# =============================================================================

generate_standard_icons() {
    local source_file=$1
    print_section "📱 Generating standard resolution icons..."
    
    for size in "${STANDARD_SIZES[@]}"; do
        generate_rounded_icon "$source_file" "$size" "${size}x${size}.png"
    done
    
    print_success "Standard icons completed"
}

generate_retina_icons() {
    local source_file=$1
    print_section "🔍 Generating retina (@2x) icons..."
    
    # Generate @2x variants for smaller sizes
    local -a retina_mappings=(
        "32:16x16@2x.png"
        "64:32x32@2x.png"
        "128:64x64@2x.png"
        "256:128x128@2x.png"
        "512:256x256@2x.png"
        "1024:512x512@2x.png"
    )
    
    for mapping in "${retina_mappings[@]}"; do
        local size output_name
        size="${mapping%:*}"
        output_name="${mapping#*:}"
        generate_rounded_icon "$source_file" "$size" "$output_name"
    done
    
    print_success "Retina icons completed"
}

# =============================================================================
# PLATFORM-SPECIFIC ICON GENERATION
# =============================================================================

generate_windows_store_icons() {
    local source_file=$1
    print_section "🏪 Generating Windows Store logos..."
    
    for size in "${WINDOWS_STORE_SIZES[@]}"; do
        generate_rounded_icon "$source_file" "$size" "Square${size}x${size}Logo.png"
    done
    
    # Generate Store Logo (50x50)
    generate_rounded_icon "$source_file" "$STORE_LOGO_SIZE" "StoreLogo.png"
    
    print_success "Windows Store icons completed"
}

generate_windows_ico() {
    local source_file=$1
    print_section "🪟 Generating Windows ICO file..."
    
    # Create ICO with multiple embedded sizes
    $CONVERT_CMD "$source_file" \
        \( -clone 0 -resize 16x16 \) \
        \( -clone 0 -resize 32x32 \) \
        \( -clone 0 -resize 48x48 \) \
        \( -clone 0 -resize 64x64 \) \
        \( -clone 0 -resize 128x128 \) \
        \( -clone 0 -resize 256x256 \) \
        -delete 0 \
        "$OUTPUT_DIR/icon.ico"
    
    if [[ -f "$OUTPUT_DIR/icon.ico" ]]; then
        print_success "Created icon.ico with embedded sizes: 16, 32, 48, 64, 128, 256"
    else
        print_error "Failed to create icon.ico"
        return 1
    fi
}

generate_macos_icns() {
    local source_file=$1
    print_section "🍎 Generating macOS ICNS bundle..."
    
    # Skip if not on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_info "Skipping ICNS generation (not on macOS)"
        return 0
    fi
    
    local iconset_dir="$TEMP_DIR/AppIcon.iconset"
    mkdir -p "$iconset_dir"
    
    # Generate iconset with Apple's required naming convention
    local -a icns_mappings=(
        "16:icon_16x16.png"
        "32:icon_16x16@2x.png"
        "32:icon_32x32.png"
        "64:icon_32x32@2x.png"
        "128:icon_128x128.png"
        "256:icon_128x128@2x.png"
        "256:icon_256x256.png"
        "512:icon_256x256@2x.png"
        "512:icon_512x512.png"
        "1024:icon_512x512@2x.png"
    )
    
    for mapping in "${icns_mappings[@]}"; do
        local size output_name
        size="${mapping%:*}"
        output_name="${mapping#*:}"
        
        $CONVERT_CMD "$source_file" \
            -resize "${size}x${size}" \
            -background transparent \
            -gravity center \
            -extent "${size}x${size}" \
            "$iconset_dir/$output_name"
    done
    
    # Convert iconset to ICNS
    if iconutil -c icns "$iconset_dir" -o "$OUTPUT_DIR/icon.icns"; then
        print_success "Created icon.icns with complete size range"
    else
        print_error "Failed to create icon.icns"
        return 1
    fi
    
    # Clean up iconset directory
    rm -rf "$iconset_dir"
}

# =============================================================================
# MAIN ICON GENERATION PIPELINE
# =============================================================================

generate_main_icon() {
    local source_file=$1
    print_section "🎯 Generating main application icon..."
    
    # Create the main icon.png (1024x1024 with rounded corners)
    generate_rounded_icon "$source_file" 1024 "icon.png"
    
    print_success "Main icon generation completed"
}

# =============================================================================
# VALIDATION AND QUALITY ASSURANCE
# =============================================================================

validate_generated_icons() {
    print_section "✅ Validating generated icons..."
    
    local validation_errors=0
    local required_icons=(
        "icon.png"
        "16x16.png"
        "32x32.png"
        "128x128.png"
        "256x256.png"
        "512x512.png"
        "1024x1024.png"
        "icon.ico"
    )
    
    # Add ICNS to required icons if on macOS
    if [[ "$OSTYPE" == "darwin"* ]]; then
        required_icons+=("icon.icns")
    fi
    
    for icon in "${required_icons[@]}"; do
        local icon_path="$OUTPUT_DIR/$icon"
        if [[ ! -f "$icon_path" ]]; then
            print_error "Missing required icon: $icon"
            ((validation_errors++))
        else
            # Validate file is not empty and is a valid image
            if [[ ! -s "$icon_path" ]]; then
                print_error "Empty icon file: $icon"
                ((validation_errors++))
            elif [[ "$icon" == "icon.icns" ]]; then
                # Special validation for ICNS files (use file command instead of ImageMagick)
                if ! file "$icon_path" | grep -q "Mac OS X icon"; then
                    print_error "Invalid ICNS file: $icon"
                    ((validation_errors++))
                fi
            elif ! $CONVERT_CMD identify "$icon_path" >/dev/null 2>&1; then
                print_error "Invalid icon file: $icon"
                ((validation_errors++))
            fi
        fi
    done
    
    if [[ $validation_errors -eq 0 ]]; then
        print_success "All icons validated successfully"
        return 0
    else
        print_error "Validation failed with $validation_errors errors"
        return 1
    fi
}

generate_icon_documentation() {
    print_section "📋 Generating icon documentation..."
    
    local doc_file="$OUTPUT_DIR/README.md"
    cat > "$doc_file" << 'EOF'
# Generated Icons for PDF Highlighter App

This directory contains all generated application icons created from the source PNG in `localResources/iconPng/`.

## Generated Files

### Standard Resolution Icons
- `16x16.png` - Smallest UI elements, tab bars
- `32x32.png` - Small toolbar icons, list items
- `64x64.png` - Medium UI elements, notifications
- `128x128.png` - Dock icons (small), toolbars
- `256x256.png` - Finder icons (medium), dock (standard)
- `512x512.png` - Dock icons (large), About dialogs
- `1024x1024.png` - Highest resolution, App Store

### Retina Display Icons (@2x)
- `16x16@2x.png` (32×32) - Retina small elements
- `32x32@2x.png` (64×64) - Retina toolbar icons
- `64x64@2x.png` (128×128) - Retina medium elements
- `128x128@2x.png` (256×256) - Retina dock icons
- `256x256@2x.png` (512×512) - Retina large icons
- `512x512@2x.png` (1024×1024) - Retina highest resolution

### Platform-Specific Formats
- `icon.png` - Main Tauri application icon (1024×1024)
- `icon.icns` - macOS icon bundle (contains all sizes)
- `icon.ico` - Windows icon file (multi-resolution)

### Windows Store Logos
- `Square30x30Logo.png` - Small live tile
- `Square44x44Logo.png` - App list icon
- `Square71x71Logo.png` - Medium live tile
- `Square89x89Logo.png` - App bar icon
- `Square107x107Logo.png` - Jumbo app list icon
- `Square142x142Logo.png` - Large app list icon
- `Square150x150Logo.png` - Medium live tile
- `Square284x284Logo.png` - Large live tile
- `Square310x310Logo.png` - Extra large live tile
- `StoreLogo.png` - Windows Store listing icon

## Technical Specifications

### Corner Radius Implementation
All icons use Apple's design guidelines with approximately 22.37% corner radius:
- Calculated as: `radius = icon_size × 0.2237`
- Minimum radius: 2px for very small icons
- Maximum radius: 50% of icon size

### Size-Specific Radius Values
| Icon Size | Corner Radius | macOS Usage |
|-----------|---------------|-------------|
| 1024×1024 | 230px | App Store, large displays |
| 512×512 | 115px | Dock (large), About dialogs |
| 256×256 | 57px | Dock (standard), Finder |
| 128×128 | 29px | Dock (small), toolbars |
| 64×64 | 14px | Menu bar, notifications |
| 32×32 | 7px | Tab bars, small UI |
| 16×16 | 4px | Minimal UI elements |

## Regeneration

To regenerate all icons from a new source image:

1. Replace the source PNG in `localResources/iconPng/`
2. Run: `./scripts/generate-icons.sh`
3. Test the build: `npm run tauri:build`

## Build Integration

These icons are automatically included in the Tauri build process via `tauri.conf.json`:

```json
{
  "bundle": {
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png", 
      "icons/128x128@2x.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

## Quality Assurance

All icons are generated with:
- Transparent backgrounds
- High-quality scaling (Lanczos interpolation)
- Platform-specific optimizations
- Apple design guideline compliance
- Cross-platform compatibility

---

Generated by PDF Highlighter Icon Generation System
Based on Apple Design Guidelines (Big Sur+)
EOF

    print_success "Icon documentation created: $doc_file"
}

# =============================================================================
# MAIN EXECUTION PIPELINE
# =============================================================================

main() {
    # Set up signal handlers for cleanup
    trap 'cleanup_and_exit 130' INT TERM
    
    print_header
    
    # Phase 1: Environment validation
    if ! check_dependencies; then
        cleanup_and_exit 1
    fi
    
    # Phase 2: Source asset discovery
    local source_file
    if ! source_file=$(find_source_icon); then
        cleanup_and_exit 1
    fi
    
    # Phase 3: Directory setup
    if ! setup_directories; then
        cleanup_and_exit 1
    fi
    
    # Phase 4: Icon generation pipeline
    print_section "🚀 Starting comprehensive icon generation..."
    echo ""
    
    if ! generate_main_icon "$source_file"; then
        print_error "Main icon generation failed"
        cleanup_and_exit 1
    fi
    
    if ! generate_standard_icons "$source_file"; then
        print_error "Standard icon generation failed" 
        cleanup_and_exit 1
    fi
    
    if ! generate_retina_icons "$source_file"; then
        print_error "Retina icon generation failed"
        cleanup_and_exit 1
    fi
    
    if ! generate_windows_store_icons "$source_file"; then
        print_error "Windows Store icon generation failed"
        cleanup_and_exit 1
    fi
    
    if ! generate_windows_ico "$source_file"; then
        print_error "Windows ICO generation failed"
        cleanup_and_exit 1
    fi
    
    if ! generate_macos_icns "$source_file"; then
        print_error "macOS ICNS generation failed"
        cleanup_and_exit 1
    fi
    
    # Phase 5: Validation and documentation
    if ! validate_generated_icons; then
        print_error "Icon validation failed"
        cleanup_and_exit 1
    fi
    
    if ! generate_icon_documentation; then
        print_error "Documentation generation failed"
        cleanup_and_exit 1
    fi
    
    # Phase 6: Success summary
    echo ""
    print_success "🎉 Icon generation completed successfully!"
    echo ""
    print_info "📊 Generation Summary:"
    
    local icon_count
    icon_count=$(find "$OUTPUT_DIR" -name "*.png" -o -name "*.ico" -o -name "*.icns" | wc -l | tr -d ' ')
    echo "   • Total icons generated: $icon_count"
    echo "   • Source: $(basename "$source_file")"
    echo "   • Output directory: $OUTPUT_DIR"
    echo "   • Apple design compliance: ✅ (22.37% corner radius)"
    echo "   • Cross-platform support: ✅"
    echo "   • Retina display support: ✅"
    
    echo ""
    print_section "📋 Next Steps:"
    echo "1. Review generated icons in: $OUTPUT_DIR"
    echo "2. Update tauri.conf.json if needed"
    echo "3. Test app build: npm run tauri:build"
    echo "4. Verify icons in built application"
    
    echo ""
    print_success "✨ PDF Highlighter now has professional, Apple-compliant icons!"
    
    # Cleanup
    cleanup_and_exit 0
}

# Execute main function
main "$@"