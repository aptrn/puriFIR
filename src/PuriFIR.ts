/**
 * Typescript porting of Kallyn - puriFIR (Minimum Phase Impulse Response Converter)
 * Creates the "perfect" impulse response from sample selection using minimum phase filter techniques
 * 
 * Created by Patrick "Kallyn" Kallenbach, 2025, ported to typescript by aptrn
 * HUGE thanks to mystran, Z1202, and AnalogGuy1 from https://www.kvraudio.com/forum/viewtopic.php?p=8849427#p8849427
 */
export class PuriFIR {
    private windowSize: number;
    private hanningWindow: number[];

    constructor(windowSize: number = 4096) {
        this.windowSize = windowSize;
        this.hanningWindow = this.createHanningWindow();
    }

    /**
     * Process input buffer to create minimum phase impulse response
     * @param inputBuffer - Input buffer as number[][] with two channels
     * @returns Processed buffer as number[][] with two channels
     */
    public process(inputBuffer: number[][]): number[][] {
        if (inputBuffer[0].length < this.windowSize) {
            throw new Error('Input buffer is too short!');
        }

        const outputBuffer: number[][] = [[], []];
        
        // Initialize output amplitudes
        // Python: amplitudes = [0] * windowSize
        const amplitudes = new Array(this.windowSize);
        for (let i = 0; i < this.windowSize; i++) {
            amplitudes[i] = 0;
        }
        
        // Process overlapping windows
        let track = 0;
        // Python: jump = (windowSize // 2)
        const jump = Math.floor(this.windowSize / 2);
        
        // Python: while selectionLength > windowSize
        while (track + this.windowSize <= inputBuffer[0].length) {
            // Construct buffer from average of left/right channels, windowed by hanning
            // Python: buffer = [((EditorSample.GetSampleAt(track + i, 0) + EditorSample.GetSampleAt(track + i, 1)) / 2 * hanning[i]) for i in range(windowSize)]
            const buffer = new Array(this.windowSize);
            for (let i = 0; i < this.windowSize; i++) {
                buffer[i] = ((inputBuffer[0][track + i] + inputBuffer[1][track + i]) / 2) * this.hanningWindow[i];
            }
            
            // Gather spectral data of buffer
            // Python: bufferFFT = fft(buffer)
            const bufferFFT = this.fft(buffer);
            
            // Update maximum peak array
            // Python: for i in range(windowSize)
            for (let i = 0; i < this.windowSize; i++) {
                // Replace each amplitude with current bin amplitude if current is larger, otherwise leave it untouched
                // Python: mag = abs(bufferFFT[i])
                const mag = this.abs(bufferFFT[i]);
                // Python: amplitudes[i] = amplitudes[i] if amplitudes[i] > mag else mag
                amplitudes[i] = amplitudes[i] > mag ? amplitudes[i] : mag;
            }
            
            // Shift selection window
            track += jump;
        }
        
        // Get log of magnitude spectrum for cepstral processing
        // Python: logMag = [cmath.log(abs(i) + 0.000001) for i in amplitudes]
        const logMag = new Array(this.windowSize);
        for (let i = 0; i < this.windowSize; i++) {
            logMag[i] = this.complexLog(amplitudes[i] + 0.000001);
        }
        
        // Compute cepstrum from FFT of log magnitude
        // Python: cepstrum = fft(logMag)
        const cepstrum = this.fft(logMag);
        
        // Prepare hilbert transform
        // Python: H = [0] * windowSize
        const H = new Array(this.windowSize);
        for (let i = 0; i < this.windowSize; i++) {
            H[i] = 0;
        }
        
        // Python: H[0] = 1
        H[0] = 1;  // DC component
        
        // Python: H[windowSize//2] = 1
        H[Math.floor(this.windowSize / 2)] = 1;  // Nyquist frequency
        
        // Python: H[1:windowSize//2] = [2 for _ in range(windowSize//2 - 1)]
        for (let i = 1; i < Math.floor(this.windowSize / 2); i++) {
            H[i] = 2;  // Double positive frequencies
        }
        
        // Apply hilbert transform by creating analytic signal in cepstral domain
        // Python: cepstrumHilbert = [cepstrum[i] * H[i] for i in range(windowSize)]
        const cepstrumHilbert = new Array(this.windowSize);
        for (let i = 0; i < this.windowSize; i++) {
            cepstrumHilbert[i] = this.complexMultiply(cepstrum[i], H[i]);
        }
        
        // Python: analyticSignal = ifft(cepstrumHilbert)
        const analyticSignal = this.ifft(cepstrumHilbert);
        
        // Get phase rotated signal from imaginary part of analytic signal, invert for minimum phase
        // Python: minPhase = [-1 * analyticSignal[i].imag for i in range(windowSize)]
        const minPhase = new Array(this.windowSize);
        for (let i = 0; i < this.windowSize; i++) {
            minPhase[i] = -1 * this.getImaginary(analyticSignal[i]);
        }
        
        // Create Minimum Phase frequency spectrum from amplitudes and new phases
        // Python: minPhaseSpectrum = [cmath.rect(amplitudes[i], minPhase[i]) for i in range(windowSize)]
        const minPhaseSpectrum = new Array(this.windowSize);
        for (let i = 0; i < this.windowSize; i++) {
            minPhaseSpectrum[i] = this.rect(amplitudes[i], minPhase[i]);
        }
        
        // Return to time domain to get Min Phase impulse response
        // Python: impulse = ifft(minPhaseSpectrum)
        const impulse = this.ifft(minPhaseSpectrum);
        
        // Print real values of output impulse
        // Python: EditorSample.SetSampleAt(i, 0, impulse[i].real) and EditorSample.SetSampleAt(i, 1, impulse[i].real)
        for (let i = 0; i < this.windowSize; i++) {
            outputBuffer[0][i] = this.getReal(impulse[i]);
            outputBuffer[1][i] = this.getReal(impulse[i]);
        }
        
        // Normalize final output
        this.normalize(outputBuffer);
        return outputBuffer;
    }

    // Python: hanning = [(0.5 - 0.5 * math.cos(2*math.pi*i/windowSize)) for i in range(windowSize)]
    private createHanningWindow(): number[] {
        const window: number[] = [];
        for (let i = 0; i < this.windowSize; i++) {
            window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / this.windowSize);
        }
        return window;
    }

    // Python: def bitReverse(x, log2n)
    private bitReverse(x: number, log2n: number): number {
        let n = 0;
        for (let i = 0; i < log2n; i++) {
            n <<= 1;
            n |= (x & 1);
            x >>= 1;
        }
        return n;
    }

    // Utility method to handle complex numbers
    private isComplex(x: any): x is { re: number; im: number } {
        return typeof x === 'object' && 're' in x && 'im' in x;
    }

    private getReal(x: number | { re: number; im: number }): number {
        if (this.isComplex(x)) {
            return x.re;
        }
        return x;
    }

    private getImaginary(x: number | { re: number; im: number }): number {
        if (this.isComplex(x)) {
            return x.im;
        }
        return 0;
    }

    private abs(x: number | { re: number; im: number }): number {
        if (this.isComplex(x)) {
            return Math.sqrt(x.re * x.re + x.im * x.im);
        }
        return Math.abs(x);
    }

    // Python: cmath.log(x)
    private complexLog(x: number | { re: number; im: number }): { re: number; im: number } {
        if (this.isComplex(x)) {
            const r = Math.sqrt(x.re * x.re + x.im * x.im);
            const theta = Math.atan2(x.im, x.re);
            return { re: Math.log(r), im: theta };
        }
        return { re: Math.log(x), im: 0 };
    }

    // Python: cmath.rect(r, phi)
    private rect(r: number, phi: number): { re: number; im: number } {
        return {
            re: r * Math.cos(phi),
            im: r * Math.sin(phi)
        };
    }

    // Multiply complex numbers or complex by scalar
    private complexMultiply(a: number | { re: number; im: number }, b: number | { re: number; im: number }): { re: number; im: number } {
        const aRe = this.getReal(a);
        const aIm = this.getImaginary(a);
        const bRe = this.getReal(b);
        const bIm = this.getImaginary(b);

        return {
            re: aRe * bRe - aIm * bIm,
            im: aRe * bIm + aIm * bRe
        };
    }

    // Python: def fft(x)
    private fft(x: number[] | { re: number; im: number }[]): { re: number; im: number }[] {
        const n = x.length;
        // Python: log2n = int(math.log2(n))
        const log2n = Math.floor(Math.log(n) / Math.log(2));
        
        // Python: X = [0] * n
        const X: { re: number; im: number }[] = new Array(n);
        
        // bit reversal of the given array
        // Python: for i in range(n): rev = bitReverse(i, log2n); X[i] = x[rev]
        for (let i = 0; i < n; i++) {
            const rev = this.bitReverse(i, log2n);
            // Convert to complex if needed
            if (typeof x[rev] === 'number') {
                X[i] = { re: x[rev] as number, im: 0 };
            } else {
                const complex = x[rev] as { re: number; im: number };
                X[i] = { re: complex.re, im: complex.im };
            }
        }
        
        // Python: j is iota, J = complex(0, 1)
        // FFT computation
        for (let s = 1; s <= log2n; s++) {
            // Python: m = 1 << s
            const m = 1 << s;
            // Python: m2 = m >> 1
            const m2 = m >> 1;
            
            // Python: wm = cmath.exp(J * (cmath.pi / m2))
            const wm = {
                re: Math.cos(Math.PI / m2),
                im: Math.sin(Math.PI / m2)
            };
            
            // Python: w = complex(1, 0)
            let w = { re: 1, im: 0 };
            
            // Python: for j in range(m2)
            for (let j = 0; j < m2; j++) {
                // Python: for k in range(j, n, m)
                for (let k = j; k < n; k += m) {
                    // Python: t = w * X[k + m2]
                    const t = {
                        re: w.re * X[k + m2].re - w.im * X[k + m2].im,
                        im: w.re * X[k + m2].im + w.im * X[k + m2].re
                    };
                    
                    // Python: u = X[k]
                    const u = { ...X[k] };
                    
                    // Python: X[k] = u + t
                    X[k] = {
                        re: u.re + t.re,
                        im: u.im + t.im
                    };
                    
                    // Python: X[k + m2] = u - t
                    X[k + m2] = {
                        re: u.re - t.re,
                        im: u.im - t.im
                    };
                }
                
                // Python: w *= wm
                const wNew = {
                    re: w.re * wm.re - w.im * wm.im,
                    im: w.re * wm.im + w.im * wm.re
                };
                w = wNew;
            }
        }
        
        return X;
    }

    // Python: def ifft(X)
    private ifft(X: { re: number; im: number }[]): { re: number; im: number }[] {
        const n = X.length;
        
        // Convert array to complex conjugate
        // Python: X = [complex(i.real, -i.imag) for i in X]
        const Xconj: { re: number; im: number }[] = X.map(x => ({ re: x.re, im: -x.im }));
        
        // Take FFT of conjugate array
        // Python: x = fft(X)
        const x = this.fft(Xconj);
        
        // undo complex conjugate and rescale
        // Python: x = [complex(i.real, -i.imag) for i in x]
        // Python: x = [i / size for i in x]
        return x.map(val => ({
            re: val.re / n,
            im: -val.im / n
        }));
    }

    private normalize(buffer: number[][]): void {
        // Find maximum absolute value
        let max = 0;
        for (let channel = 0; channel < 2; channel++) {
            for (let i = 0; i < this.windowSize; i++) {
                max = Math.max(max, Math.abs(buffer[channel][i]));
            }
        }
        
        // Normalize if max > 0
        if (max > 0) {
            const scale = 1.0 / max;
            for (let channel = 0; channel < 2; channel++) {
                for (let i = 0; i < this.windowSize; i++) {
                    buffer[channel][i] *= scale;
                }
            }
        }
    }
} 