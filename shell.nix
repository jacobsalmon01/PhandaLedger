{ pkgs ? import <nixpkgs> {} }:

pkgs.mkShell {
  name = "phandaledger";

  packages = with pkgs; [
    nodejs_22
    playwright-driver.browsers
  ];

  shellHook = ''
    export PLAYWRIGHT_BROWSERS_PATH=${pkgs.playwright-driver.browsers}
    export PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
    echo "PhandaLedger dev shell — node $(node --version), npm $(npm --version)"
    echo "Commands: npm run dev | build | lint | preview | test | screenshot"
  '';
}
