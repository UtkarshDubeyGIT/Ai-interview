# ElevenLabs UI

Waveform, Conversation, and Message in `src/components/ui/` are adapted from
https://github.com/elevenlabs/ui at commit `88a5342ee74632a3f66f3cf9a75cbe87f97007f9`.
Waveform retains the upstream canvas renderer. Conversation and Message retain
the composable API with local semantic CSS; Conversation uses native scrolling
and ResizeObserver instead of the upstream scrolling dependency. Unused variants,
avatar dependencies, and microphone capture were omitted. No ElevenLabs service
or credentials are required.

MIT License

Copyright (c) 2025 Eleven Labs Inc.

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
