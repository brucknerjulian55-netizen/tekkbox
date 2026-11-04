package app.tekkbox;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Bundle;
import android.util.Base64;
import android.view.View;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;

public class MainActivity extends Activity {
  private static final int PICK = 1, SAVE = 2;
  private static final String HOST = "appassets.androidplatform.net";
  private WebView web;
  private ValueCallback<Uri[]> pick;
  private File out;
  private String mime = "application/json";

  @Override protected void onCreate(Bundle b) {
    super.onCreate(b);
    getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
    final WebViewAssetLoader loader = new WebViewAssetLoader.Builder().setDomain(HOST)
        .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this)).build();
    web = new WebView(this);
    WebSettings s = web.getSettings();
    s.setJavaScriptEnabled(true);
    s.setDomStorageEnabled(true);
    s.setMediaPlaybackRequiresUserGesture(false);
    s.setAllowFileAccess(false);
    web.setOverScrollMode(View.OVER_SCROLL_NEVER);
    web.setWebViewClient(new WebViewClient() {
      @Override public WebResourceResponse shouldInterceptRequest(WebView v, WebResourceRequest r) {
        return loader.shouldInterceptRequest(r.getUrl());
      }
      @Override public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
        if (HOST.equals(r.getUrl().getHost())) return false;
        startActivity(new Intent(Intent.ACTION_VIEW, r.getUrl()));
        return true;
      }
    });
    web.setWebChromeClient(new WebChromeClient() {
      @Override public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams p) {
        if (pick != null) pick.onReceiveValue(null);
        pick = cb;
        Intent i = new Intent(Intent.ACTION_GET_CONTENT).addCategory(Intent.CATEGORY_OPENABLE).setType("*/*");
        startActivityForResult(Intent.createChooser(i, "Datei wählen"), PICK);
        return true;
      }
    });
    web.addJavascriptInterface(new Bridge(), "TekkNative");
    setContentView(web);
    immersive();
    if (b == null) web.loadUrl("https://" + HOST + "/assets/index.html");
    else web.restoreState(b);
  }

  private void immersive() {
    getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_FULLSCREEN
        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
  }
  @Override public void onWindowFocusChanged(boolean f) { super.onWindowFocusChanged(f); if (f) immersive(); }
  @Override protected void onSaveInstanceState(Bundle b) { super.onSaveInstanceState(b); web.saveState(b); }
  @Override public void onBackPressed() {
    web.evaluateJavascript("window.TekkBack&&TekkBack()", v -> { if (!"true".equals(v)) moveTaskToBack(true); });
  }

  @Override protected void onActivityResult(int req, int res, Intent d) {
    super.onActivityResult(req, res, d);
    if (req == PICK && pick != null) {
      pick.onReceiveValue(res == RESULT_OK && d != null && d.getData() != null ? new Uri[]{d.getData()} : null);
      pick = null;
    } else if (req == SAVE && res == RESULT_OK && d != null && d.getData() != null) {
      try (InputStream in = new FileInputStream(out); OutputStream o = getContentResolver().openOutputStream(d.getData())) {
        byte[] buf = new byte[65536]; int n;
        while ((n = in.read(buf)) > 0) o.write(buf, 0, n);
      } catch (Exception e) { web.evaluateJavascript("toast('Die Datei konnte nicht gespeichert werden.')", null); }
    }
  }

  class Bridge {
    private FileOutputStream os;
    @JavascriptInterface public int version() { return BuildConfig.VERSION_CODE; }
    @JavascriptInterface public void openUrl(String u) { if (u.startsWith("https://github.com/")) startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(u))); }
    @JavascriptInterface public void begin(String name, String type) throws Exception {
      File dir = new File(getCacheDir(), "out"); dir.mkdirs();
      out = new File(dir, new File(name).getName()); mime = type; os = new FileOutputStream(out);
    }
    @JavascriptInterface public void chunk(String b64) throws Exception { os.write(Base64.decode(b64, Base64.DEFAULT)); }
    @JavascriptInterface public void finish(boolean share) throws Exception {
      os.close();
      if (share) {
        Uri u = FileProvider.getUriForFile(MainActivity.this, "app.tekkbox.files", out);
        Intent i = new Intent(Intent.ACTION_SEND).setType(mime).putExtra(Intent.EXTRA_STREAM, u).addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
        startActivity(Intent.createChooser(i, "Teilen"));
      } else {
        startActivityForResult(new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE).setType(mime).putExtra(Intent.EXTRA_TITLE, out.getName()), SAVE);
      }
    }
  }
}
