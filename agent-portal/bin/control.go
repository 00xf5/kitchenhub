package main

import (
	"bufio"
	"bytes"
	"encoding/binary"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"os"
	"runtime"
	"strconv"
	"strings"
	"syscall"
	"time"
	"unsafe"
)

// Win32 APIs
var (
	user32                       = syscall.NewLazyDLL("user32.dll")
	procCreateDesktopW           = user32.NewProc("CreateDesktopW")
	procSetThreadDesktop         = user32.NewProc("SetThreadDesktop")
	procGetThreadDesktop         = user32.NewProc("GetThreadDesktop")
	procCloseDesktop             = user32.NewProc("CloseDesktop")
	procSetCursorPos             = user32.NewProc("SetCursorPos")
	procMouseEvent               = user32.NewProc("mouse_event")
	procSendInput                = user32.NewProc("SendInput")
	procGetSystemMetrics         = user32.NewProc("GetSystemMetrics")
	procGetDC                    = user32.NewProc("GetDC")
	procReleaseDC                = user32.NewProc("ReleaseDC")
	procWindowFromPoint          = user32.NewProc("WindowFromPoint")
	procScreenToClient           = user32.NewProc("ScreenToClient")
	procPostMessageW             = user32.NewProc("PostMessageW")
	procGetForegroundWindow      = user32.NewProc("GetForegroundWindow")
	procGetWindowThreadProcessId = user32.NewProc("GetWindowThreadProcessId")
	procGetGUIThreadInfo         = user32.NewProc("GetGUIThreadInfo")

	gdi32                      = syscall.NewLazyDLL("gdi32.dll")
	procCreateCompatibleDC     = gdi32.NewProc("CreateCompatibleDC")
	procCreateCompatibleBitmap = gdi32.NewProc("CreateCompatibleBitmap")
	procSelectObject           = gdi32.NewProc("SelectObject")
	procBitBlt                 = gdi32.NewProc("BitBlt")
	procDeleteDC               = gdi32.NewProc("DeleteDC")
	procDeleteObject           = gdi32.NewProc("DeleteObject")
	procGetDIBits              = gdi32.NewProc("GetDIBits")

	kernel32               = syscall.NewLazyDLL("kernel32.dll")
	procCreateProcessW     = kernel32.NewProc("CreateProcessW")
	procGetCurrentThreadId = kernel32.NewProc("GetCurrentThreadId")
)

const (
	GENERIC_ALL          = 0x10000000
	MOUSEEVENTF_LEFTDOWN = 0x0002
	MOUSEEVENTF_LEFTUP   = 0x0004
	INPUT_KEYBOARD       = 1
	KEYEVENTF_UNICODE    = 0x0004
	KEYEVENTF_KEYUP      = 0x0008

	SM_CXSCREEN    = 0
	SM_CYSCREEN    = 1
	SRCCOPY        = 0x00CC0020
	DIB_RGB_COLORS = 0

	WM_LBUTTONDOWN = 0x0201
	WM_LBUTTONUP   = 0x0202
	WM_CHAR        = 0x0102
	MK_LBUTTON     = 0x0001
)

// Win32 Structs
type BITMAPINFOHEADER struct {
	BiSize          uint32
	BiWidth         int32
	BiHeight        int32
	BiPlanes        uint16
	BiBitCount      uint16
	BiCompression   uint32
	BiSizeImage     uint32
	BiXPelsPerMeter int32
	BiYPelsPerMeter int32
	BiClrUsed       uint32
	BiClrImportant  uint32
}

type BITMAPINFO struct {
	Header BITMAPINFOHEADER
	Colors [4]byte // RGBQUAD array place holder
}

type STARTUPINFOW struct {
	Cb              uint32
	LpReserved      *uint16
	LpDesktop       *uint16
	LpTitle         *uint16
	DwX             uint32
	DwY             uint32
	DwXSize         uint32
	DwYSize         uint32
	DwXCountChars   uint32
	DwYCountChars   uint32
	DwFillAttribute uint32
	DwFlags         uint32
	WShowWindow     uint16
	CbReserved2     uint16
	LpReserved2     *byte
	HStdInput       syscall.Handle
	HStdOutput      syscall.Handle
	HStdError       syscall.Handle
}

type PROCESS_INFORMATION struct {
	HProcess    syscall.Handle
	HThread     syscall.Handle
	DwProcessId uint32
	DwThreadId  uint32
}

type input64 struct {
	inputType uint32
	_         uint32 // padding
	wVk       uint16
	wScan     uint16
	dwFlags   uint32
	time      uint32
	_         uint32 // padding
	extraInfo uintptr
	_         uint64 // padding to 40 bytes
}

type POINT struct {
	X int32
	Y int32
}

type GUITHREADINFO struct {
	CbSize        uint32
	Flags         uint32
	HwndActive    uintptr
	HwndFocus     uintptr
	HwndCapture   uintptr
	HwndMenuOwner uintptr
	HwndMoveSize  uintptr
	HwndCaret     uintptr
	RcCaret       [16]byte // RECT struct size is 16 bytes
}

func click(x, y int, lastHWND *uintptr) {
	// WindowFromPoint takes POINT by value.
	// On x64 Windows, an 8-byte structure is passed by value in a single register (uintptr).
	// The X coordinate is in the low 32 bits, and Y is in the high 32 bits.
	val := uintptr(uint32(x)) | (uintptr(uint32(y)) << 32)
	hwnd, _, _ := procWindowFromPoint.Call(val)
	if hwnd == 0 {
		return
	}
	*lastHWND = hwnd

	pt := POINT{X: int32(x), Y: int32(y)}
	procScreenToClient.Call(hwnd, uintptr(unsafe.Pointer(&pt)))

	lParam := uintptr(uint32(pt.Y)<<16 | uint32(pt.X)&0xFFFF)
	procPostMessageW.Call(hwnd, WM_LBUTTONDOWN, MK_LBUTTON, lParam)
	time.Sleep(50 * time.Millisecond)
	procPostMessageW.Call(hwnd, WM_LBUTTONUP, 0, lParam)
}

func getFocusedHWND(lastHWND uintptr) uintptr {
	fgHWND, _, _ := procGetForegroundWindow.Call()
	if fgHWND == 0 {
		return lastHWND
	}
	threadID, _, _ := procGetWindowThreadProcessId.Call(fgHWND, 0)
	if threadID == 0 {
		return fgHWND
	}
	var gui GUITHREADINFO
	gui.CbSize = uint32(unsafe.Sizeof(gui))
	res, _, _ := procGetGUIThreadInfo.Call(threadID, uintptr(unsafe.Pointer(&gui)))
	if res != 0 && gui.HwndFocus != 0 {
		return gui.HwndFocus
	}
	return fgHWND
}

func typeString(text string, lastHWND uintptr) {
	targetHWND := getFocusedHWND(lastHWND)
	if targetHWND == 0 {
		return
	}
	for _, r := range []rune(text) {
		procPostMessageW.Call(targetHWND, WM_CHAR, uintptr(r), 0)
	}
}

// captureDesktop captures the thread's current desktop into a JPEG file.
func captureDesktop(outputPath string) error {
	data, err := captureDesktopToMemory()
	if err != nil {
		return err
	}
	return os.WriteFile(outputPath, data, 0644)
}

// captureDesktopToMemory captures the thread's current desktop and returns JPEG bytes.
func captureDesktopToMemory() ([]byte, error) {
	w, _, _ := procGetSystemMetrics.Call(SM_CXSCREEN)
	h, _, _ := procGetSystemMetrics.Call(SM_CYSCREEN)

	if w == 0 || h == 0 {
		w, h = 1920, 1080
	}

	hdcScreen, _, _ := procGetDC.Call(0)
	if hdcScreen == 0 {
		return nil, fmt.Errorf("failed to get screen DC")
	}
	defer procReleaseDC.Call(0, hdcScreen)

	hdcMem, _, _ := procCreateCompatibleDC.Call(hdcScreen)
	if hdcMem == 0 {
		return nil, fmt.Errorf("failed to create compatible DC")
	}
	defer procDeleteDC.Call(hdcMem)

	hBitmap, _, _ := procCreateCompatibleBitmap.Call(hdcScreen, w, h)
	if hBitmap == 0 {
		return nil, fmt.Errorf("failed to create compatible bitmap")
	}
	defer procDeleteObject.Call(hBitmap)

	oldObj, _, _ := procSelectObject.Call(hdcMem, hBitmap)
	defer procSelectObject.Call(hdcMem, oldObj)

	procBitBlt.Call(hdcMem, 0, 0, w, h, hdcScreen, 0, 0, SRCCOPY)

	// Get Bitmap bits
	var bmi BITMAPINFO
	bmi.Header.BiSize = uint32(unsafe.Sizeof(bmi.Header))
	bmi.Header.BiWidth = int32(w)
	bmi.Header.BiHeight = -int32(h) // Top-down bitmap
	bmi.Header.BiPlanes = 1
	bmi.Header.BiBitCount = 32
	bmi.Header.BiCompression = 0 // BI_RGB

	bufSize := w * h * 4
	pixelData := make([]byte, bufSize)

	res, _, _ := procGetDIBits.Call(
		hdcMem,
		hBitmap,
		0,
		h,
		uintptr(unsafe.Pointer(&pixelData[0])),
		uintptr(unsafe.Pointer(&bmi)),
		DIB_RGB_COLORS,
	)

	if res == 0 {
		return nil, fmt.Errorf("failed to get bitmap bits")
	}

	// Convert BGRA to RGBA for Go image encoding
	img := image.NewRGBA(image.Rect(0, 0, int(w), int(h)))
	for y := 0; y < int(h); y++ {
		for x := 0; x < int(w); x++ {
			offset := (y*int(w) + x) * 4
			b := pixelData[offset]
			g := pixelData[offset+1]
			r := pixelData[offset+2]
			a := pixelData[offset+3]

			img.SetRGBA(x, y, color.RGBA{R: r, G: g, B: b, A: a})
		}
	}

	// Encode to JPEG in memory buffer
	var buf bytes.Buffer
	if err := jpeg.Encode(&buf, img, &jpeg.Options{Quality: 60}); err != nil {
		return nil, err
	}
	return buf.Bytes(), nil
}

func spawnProcessInDesktop(desktopName, command string) error {
	desktopUTF16, err := syscall.UTF16PtrFromString("WinSta0\\" + desktopName)
	if err != nil {
		return err
	}

	cmdUTF16, err := syscall.UTF16PtrFromString(command)
	if err != nil {
		return err
	}

	var si STARTUPINFOW
	si.Cb = uint32(unsafe.Sizeof(si))
	si.LpDesktop = desktopUTF16

	var pi PROCESS_INFORMATION

	res, _, err := procCreateProcessW.Call(
		0,
		uintptr(unsafe.Pointer(cmdUTF16)),
		0,
		0,
		0,
		0, // CREATE_NEW_CONSOLE or similar
		0,
		0,
		uintptr(unsafe.Pointer(&si)),
		uintptr(unsafe.Pointer(&pi)),
	)

	if res == 0 {
		return fmt.Errorf("failed to create process: %v", err)
	}

	syscall.CloseHandle(pi.HProcess)
	syscall.CloseHandle(pi.HThread)
	return nil
}

func main() {
	if len(os.Args) < 2 {
		fmt.Println("Usage: control <command> [args...]")
		os.Exit(1)
	}

	cmd := os.Args[1]

	switch cmd {
	case "session":
		// Lock main goroutine to OS thread since it attaches to the desktop
		runtime.LockOSThread()

		// 1. Create a secure, isolated background desktop
		deskName := "KitchenHubDesk"
		desktopNamePtr, _ := syscall.UTF16PtrFromString(deskName)
		hDesk, _, _ := procCreateDesktopW.Call(
			uintptr(unsafe.Pointer(desktopNamePtr)),
			0,
			0,
			0,
			GENERIC_ALL,
			0,
		)

		if hDesk == 0 {
			// If creation failed, attempt to open existing
			fmt.Println("ERR failed to create or attach desktop")
			os.Exit(1)
		}

		// Save the default thread desktop
		threadId, _, _ := procGetCurrentThreadId.Call()
		originalDesk, _, _ := procGetThreadDesktop.Call(threadId)

		// 2. Attach our control thread to the private background desktop
		procSetThreadDesktop.Call(hDesk)
		defer func() {
			if originalDesk != 0 {
				procSetThreadDesktop.Call(originalDesk)
			}
			procCloseDesktop.Call(hDesk)
		}()

		// 3. Spawn isolated tools (CMD, explorer) inside the hidden desktop
		spawnProcessInDesktop(deskName, "cmd.exe /c start explorer.exe")
		spawnProcessInDesktop(deskName, "cmd.exe")

		fmt.Println("SESSION_READY")

		// 4. Start periodic background capture routine
		// Write binary frames to stdout instead of file
		go func() {
			runtime.LockOSThread()
			procSetThreadDesktop.Call(hDesk)
			for {
				time.Sleep(33 * time.Millisecond) // 30 FPS
				frameData, err := captureDesktopToMemory()
				if err != nil {
					continue
				}
				// Write frame size (4 bytes) + frame data to stdout
				size := uint32(len(frameData))
				binary.Write(os.Stdout, binary.LittleEndian, &size)
				os.Stdout.Write(frameData)
			}
		}()

		// 5. Input command parsing loop
		var lastHWND uintptr
		scanner := bufio.NewScanner(os.Stdin)
		for scanner.Scan() {
			line := strings.TrimSpace(scanner.Text())
			if line == "" {
				continue
			}

			parts := strings.SplitN(line, " ", 3)
			subCmd := parts[0]

			switch subCmd {
			case "click":
				if len(parts) < 3 {
					continue
				}
				x, _ := strconv.Atoi(parts[1])
				y, _ := strconv.Atoi(parts[2])
				click(x, y, &lastHWND)

			case "type":
				if len(parts) < 2 {
					continue
				}
				text := strings.Join(parts[1:], " ")
				typeString(text, lastHWND)

			case "exit":
				return
			}
		}

	default:
		fmt.Printf("Unknown command: %s\n", cmd)
		os.Exit(1)
	}
}
