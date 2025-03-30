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

        // Process each channel independently
        const outputBuffer: number[][] = [[], []];
        
        for (let channel = 0; channel < 2; channel++) {
            // Initialize output amplitudes for this channel
            const amplitudes: number[] = [];
            for (let i = 0; i < this.windowSize; i++) {
                amplitudes[i] = 0;
            }
            
            // Process the input buffer in overlapping windows
            let track = 0;
            const jump = this.windowSize / 2;
            
            while (track + this.windowSize <= inputBuffer[channel].length) {
                // Construct buffer from current channel, windowed by hanning
                const buffer: number[] = [];
                for (let i = 0; i < this.windowSize; i++) {
                    buffer[i] = inputBuffer[channel][track + i] * this.hanningWindow[i];
                }
                
                // Gather spectral data of buffer
                const bufferFFT = this.fft(buffer);
                
                // Update maximum peak array
                for (let i = 0; i < this.windowSize; i++) {
                    const mag = Math.sqrt(bufferFFT[i].re * bufferFFT[i].re + bufferFFT[i].im * bufferFFT[i].im);
                    amplitudes[i] = Math.max(amplitudes[i], mag);
                }
                
                track += jump;
            }

            // Get log of magnitude spectrum for cepstral processing
            const logMag: number[] = [];
            for (let i = 0; i < this.windowSize; i++) {
                logMag[i] = Math.log(amplitudes[i] + 0.000001);
            }
            
            // Compute cepstrum from FFT of log magnitude
            const cepstrum = this.fft(logMag);
            
            // Prepare hilbert transform
            const H: number[] = [];
            for (let i = 0; i < this.windowSize; i++) {
                H[i] = 0;
            }
            H[0] = 1; // DC component
            H[this.windowSize / 2] = 1; // Nyquist frequency
            for (let i = 1; i < this.windowSize / 2; i++) {
                H[i] = 2; // Double positive frequencies
            }
            
            // Apply hilbert transform
            const cepstrumHilbert: { re: number; im: number }[] = [];
            for (let i = 0; i < this.windowSize; i++) {
                cepstrumHilbert[i] = {
                    re: cepstrum[i].re * H[i],
                    im: cepstrum[i].im * H[i]
                };
            }
            const analyticSignal = this.ifft(cepstrumHilbert);
            
            // Get phase rotated signal from imaginary part of analytic signal
            const minPhase: number[] = [];
            for (let i = 0; i < this.windowSize; i++) {
                minPhase[i] = -analyticSignal[i].im;
            }
            
            // Create Minimum Phase frequency spectrum
            const minPhaseSpectrum: { re: number; im: number }[] = [];
            for (let i = 0; i < this.windowSize; i++) {
                minPhaseSpectrum[i] = {
                    re: amplitudes[i] * Math.cos(minPhase[i]),
                    im: amplitudes[i] * Math.sin(minPhase[i])
                };
            }
            
            // Return to time domain to get Min Phase impulse response
            const impulse = this.ifft(minPhaseSpectrum);
            
            // Copy real values to output channel
            for (let i = 0; i < this.windowSize; i++) {
                outputBuffer[channel][i] = impulse[i].re;
            }
        }
        
        // Normalize output
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

    private fft(x: number[]): { re: number; im: number }[] {
        const n = x.length;
        const X: { re: number; im: number }[] = [];
        for (let i = 0; i < n; i++) {
            X[i] = { re: 0, im: 0 };
        }
        const log2n = Math.log(n) / Math.log(2);
        
        // Bit reversal
        for (let i = 0; i < n; i++) {
            const rev = this.bitReverse(i, log2n);
            X[i] = { re: x[rev], im: 0 };
        }
        
        // FFT computation
        for (let s = 1; s <= log2n; s++) {
            const m = 1 << s;
            const m2 = m >> 1;
            let w = { re: 1, im: 0 };
            
            const wm = {
                re: Math.cos(Math.PI / m2),
                im: Math.sin(Math.PI / m2)
            };
            
            for (let j = 0; j < m2; j++) {
                for (let k = j; k < n; k += m) {
                    const t = {
                        re: w.re * X[k + m2].re - w.im * X[k + m2].im,
                        im: w.re * X[k + m2].im + w.im * X[k + m2].re
                    };
                    
                    const u = X[k];
                    X[k] = {
                        re: u.re + t.re,
                        im: u.im + t.im
                    };
                    X[k + m2] = {
                        re: u.re - t.re,
                        im: u.im - t.im
                    };
                }
                
                const wNew = {
                    re: w.re * wm.re - w.im * wm.im,
                    im: w.re * wm.im + w.im * wm.re
                };
                w = wNew;
            }
        }
        
        return X;
    }

    private ifft(X: { re: number; im: number }[]): { re: number; im: number }[] {
        const n = X.length;
        
        // Take complex conjugate
        const XConj: { re: number; im: number }[] = [];
        for (let i = 0; i < n; i++) {
            XConj[i] = { re: X[i].re, im: -X[i].im };
        }
        
        // Forward FFT
        const xReals: number[] = [];
        for (let i = 0; i < n; i++) {
            xReals[i] = XConj[i].re;
        }
        const x = this.fft(xReals);
        
        // Take complex conjugate and scale
        const result: { re: number; im: number }[] = [];
        for (let i = 0; i < n; i++) {
            result[i] = {
                re: x[i].re / n,
                im: -x[i].im / n
            };
        }
        return result;
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