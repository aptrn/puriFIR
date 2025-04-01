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
        
        for (let channel = 0; channel < 2; channel++) {
            // Initialize amplitude spectrum
            const amplitudes = new Array(this.windowSize);
            for (let i = 0; i < this.windowSize; i++) {
                amplitudes[i] = 0;
            }
            
            // Process overlapping windows
            let track = 0;
            const jump = this.windowSize / 2;
            
            while (track + this.windowSize <= inputBuffer[channel].length) {
                // Apply hanning window
                const buffer = new Array(this.windowSize);
                for (let i = 0; i < this.windowSize; i++) {
                    buffer[i] = inputBuffer[channel][track + i] * this.hanningWindow[i];
                }
                
                // Get spectrum
                const spectrum = this.fft(buffer);
                
                // Update maximum magnitudes
                for (let i = 0; i < this.windowSize; i++) {
                    const mag = Math.sqrt(spectrum[i].re * spectrum[i].re + spectrum[i].im * spectrum[i].im);
                    if (mag > amplitudes[i]) amplitudes[i] = mag;
                }
                
                track += jump;
            }
            
            // Convert to minimum phase
            
            // 1. Get log spectrum
            const logSpectrum = new Array(this.windowSize);
            for (let i = 0; i < this.windowSize; i++) {
                logSpectrum[i] = Math.log(Math.max(amplitudes[i], 1e-6));
            }
            
            // 2. Get cepstrum
            const cepstrum = this.fft(logSpectrum);
            
            // 3. Apply Hilbert transform in cepstral domain
            const H = new Array(this.windowSize);
            for (let i = 0; i < this.windowSize; i++) H[i] = 0;
            H[0] = 1;
            H[this.windowSize / 2] = 1;
            for (let i = 1; i < this.windowSize / 2; i++) H[i] = 2;
            
            const cepstrumHilbert = new Array(this.windowSize);
            for (let i = 0; i < this.windowSize; i++) {
                cepstrumHilbert[i] = {
                    re: cepstrum[i].re * H[i],
                    im: cepstrum[i].im * H[i]
                };
            }
            
            // 4. Get minimum phase
            const analyticSignal = this.ifft(cepstrumHilbert);
            const minPhase = analyticSignal.map(x => -x.im);
            
            // 5. Construct minimum phase spectrum
            const minPhaseSpectrum = new Array(this.windowSize);
            for (let i = 0; i < this.windowSize; i++) {
                minPhaseSpectrum[i] = {
                    re: amplitudes[i] * Math.cos(minPhase[i]),
                    im: amplitudes[i] * Math.sin(minPhase[i])
                };
            }
            
            // 6. Get impulse response
            const impulse = this.ifft(minPhaseSpectrum);
            
            // Copy to output
            for (let i = 0; i < this.windowSize; i++) {
                outputBuffer[channel][i] = impulse[i].re;
            }
        }
        
        this.normalize(outputBuffer);
        return outputBuffer;
    }

    private createHanningWindow(): number[] {
        const window: number[] = [];
        for (let i = 0; i < this.windowSize; i++) {
            window[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / this.windowSize);
        }
        return window;
    }

    private bitReverse(x: number, log2n: number): number {
        let n = 0;
        for (let i = 0; i < log2n; i++) {
            n <<= 1;
            n |= (x & 1);
            x >>= 1;
        }
        return n;
    }

    private fft(x: number[] | { re: number; im: number }[]): { re: number; im: number }[] {
        const n = x.length;
        const log2n = Math.log(n) / Math.log(2);
        
        // Convert input to complex numbers if it's real
        const X: { re: number; im: number }[] = new Array(n);
        for (let i = 0; i < n; i++) {
            if (typeof x[i] === 'number') {
                X[i] = { re: x[i] as number, im: 0 };
            } else {
                const c = x[i] as { re: number; im: number };
                X[i] = { re: c.re, im: c.im };
            }
        }
        
        // Bit reversal
        for (let i = 0; i < n; i++) {
            const j = this.bitReverse(i, log2n);
            if (j > i) {
                const temp = { ...X[i] };
                X[i] = { ...X[j] };
                X[j] = temp;
            }
        }
        
        // FFT computation
        for (let s = 1; s <= log2n; s++) {
            const m = 1 << s;
            const m2 = m >> 1;
            const wm = {
                re: Math.cos(2 * Math.PI / m),
                im: -Math.sin(2 * Math.PI / m)
            };
            
            for (let k = 0; k < n; k += m) {
                let w = { re: 1, im: 0 };
                
                for (let j = 0; j < m2; j++) {
                    const t = {
                        re: w.re * X[k + j + m2].re - w.im * X[k + j + m2].im,
                        im: w.re * X[k + j + m2].im + w.im * X[k + j + m2].re
                    };
                    
                    const u = X[k + j];
                    
                    X[k + j] = {
                        re: u.re + t.re,
                        im: u.im + t.im
                    };
                    
                    X[k + j + m2] = {
                        re: u.re - t.re,
                        im: u.im - t.im
                    };
                    
                    const wNew = {
                        re: w.re * wm.re - w.im * wm.im,
                        im: w.re * wm.im + w.im * wm.re
                    };
                    w = wNew;
                }
            }
        }
        
        return X;
    }

    private ifft(X: { re: number; im: number }[]): { re: number; im: number }[] {
        const n = X.length;
        
        // Conjugate the input
        const Xconj = X.map(x => ({ re: x.re, im: -x.im }));
        
        // Do forward FFT
        const x = this.fft(Xconj);
        
        // Conjugate and scale the result
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
            for (let channel = 0; channel < 2; channel++) {
                for (let i = 0; i < this.windowSize; i++) {
                    buffer[channel][i] /= max;
                }
            }
        }
    }
} 