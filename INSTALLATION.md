# Installation Guide for Windows

## Step 1: Install Ruby

You need to install Ruby first, which includes `gem` (RubyGems package manager).

### Option A: Using RubyInstaller (Recommended)

1. **Download RubyInstaller:**
   - Go to https://rubyinstaller.org/downloads/
   - Download **Ruby+Devkit 3.2.x (x64)** - this includes everything you need
   - Choose the version with "Devkit" - it's required for Jekyll

2. **Run the installer:**
   - Run the downloaded `.exe` file
   - Check "Add Ruby executables to your PATH" during installation
   - Complete the installation

3. **Run the Devkit setup:**
   - After installation, a command prompt window will open automatically
   - If it doesn't, open "Start Command Prompt with Ruby" from the Start menu
   - Type `ridk install` and press Enter
   - Follow the prompts (usually just press Enter to accept defaults)

4. **Verify installation:**
   - Close and reopen your terminal/PowerShell
   - Run: `ruby --version`
   - Run: `gem --version`
   - Both should show version numbers

### Option B: Using Chocolatey (if you have it)

```powershell
choco install ruby
```

## Step 2: Install Bundler

Once Ruby is installed, install Bundler:

```powershell
gem install bundler
```

## Step 3: Install Jekyll Dependencies

Navigate to your project directory and run:

```powershell
bundle install
```

## Step 4: Run Jekyll

Start the Jekyll development server:

```powershell
bundle exec jekyll serve
```

Your site will be available at `http://localhost:4000`

## Troubleshooting

- **"ruby is not recognized"**: Make sure Ruby is added to your PATH. Restart your terminal after installation.
- **SSL errors**: Run `gem sources --add https://rubygems.org/ --remove https://rubygems.org/`
- **Permission errors**: You may need to run PowerShell as Administrator


