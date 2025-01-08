/**
 * expression: string
 * Module: http.matchers.expression
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchExpression
 * MatchExpression matches requests by evaluating a
 * [CEL](https://github.com/google/cel-spec) expression.
 * This enables complex logic to be expressed using a comfortable,
 * familiar syntax. Please refer to
 * [the standard definitions of CEL functions and operators](https://github.com/google/cel-spec/blob/master/doc/langdef.md#standard-definitions).
 *
 * This matcher's JSON interface is actually a string, not a struct.
 * The generated docs are not correct because this type has custom
 * marshaling logic.
 *
 * COMPATIBILITY NOTE: This module is still experimental and is not
 * subject to Caddy's compatibility guarantee.
 *
 *
 */
export type HttpMatchersExpression = string;
/**
 * host: array
 * Module: http.matchers.host
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchHost
 * MatchHost matches requests by the Host value (case-insensitive).
 *
 * When used in a top-level HTTP route,
 * [qualifying domain names](/docs/automatic-https#hostname-requirements)
 * may trigger [automatic HTTPS](/docs/automatic-https), which automatically
 * provisions and renews certificates for you. Before doing this, you
 * should ensure that DNS records for these domains are properly configured,
 * especially A/AAAA pointed at your server.
 *
 * Automatic HTTPS can be
 * [customized or disabled](/docs/modules/http#servers/automatic_https).
 *
 * Wildcards (`*`) may be used to represent exactly one label of the
 * hostname, in accordance with RFC 1034 (because host matchers are also
 * used for automatic HTTPS which influences TLS certificates). Thus,
 * a host of `*` matches hosts like `localhost` or `internal` but not
 * `example.com`. To catch all hosts, omit the host matcher entirely.
 *
 * The wildcard can be useful for matching all subdomains, for example:
 * `*.example.com` matches `foo.example.com` but not `foo.bar.example.com`.
 *
 * Duplicate entries will return an error.
 *
 *
 */
export type HttpMatchersHost = string[];
/**
 * method: array
 * Module: http.matchers.method
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchMethod
 * MatchMethod matches requests by the method.
 *
 *
 */
export type HttpMatchersMethod = string[];
/**
 * path: array
 * Module: http.matchers.path
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchPath
 * MatchPath case-insensitively matches requests by the URI's path. Path
 * matching is exact, not prefix-based, giving you more control and clarity
 * over matching. Wildcards (`*`) may be used:
 *
 * - At the end only, for a prefix match (`/prefix/*`)
 * - At the beginning only, for a suffix match (`*.suffix`)
 * - On both sides only, for a substring match (`* /contains/*`)
 * - In the middle, for a globular match (`/accounts/* /info`)
 *
 * Slashes are significant; i.e. `/foo*` matches `/foo`, `/foo/`, `/foo/bar`,
 * and `/foobar`; but `/foo/*` does not match `/foo` or `/foobar`. Valid
 * paths start with a slash `/`.
 *
 * Because there are, in general, multiple possible escaped forms of any
 * path, path matchers operate in unescaped space; that is, path matchers
 * should be written in their unescaped form to prevent ambiguities and
 * possible security issues, as all request paths will be normalized to
 * their unescaped forms before matcher evaluation.
 *
 * However, escape sequences in a match pattern are supported; they are
 * compared with the request's raw/escaped path for those bytes only.
 * In other words, a matcher of `/foo%2Fbar` will match a request path
 * of precisely `/foo%2Fbar`, but not `/foo/bar`. It follows that matching
 * the literal percent sign (%) in normalized space can be done using the
 * escaped form, `%25`.
 *
 * Even though wildcards (`*`) operate in the normalized space, the special
 * escaped wildcard (`%*`), which is not a valid escape sequence, may be
 * used in place of a span that should NOT be decoded; that is, `/bands/%*`
 * will match `/bands/AC%2fDC` whereas `/bands/*` will not.
 *
 * Even though path matching is done in normalized space, the special
 * wildcard `%*` may be used in place of a span that should NOT be decoded;
 * that is, `/bands/%* /` will match `/bands/AC%2fDC/` whereas `/bands/* /`
 * will not.
 *
 * This matcher is fast, so it does not support regular expressions or
 * capture groups. For slower but more powerful matching, use the
 * path_regexp matcher. (Note that due to the special treatment of
 * escape sequences in matcher patterns, they may perform slightly slower
 * in high-traffic environments.)
 *
 *
 */
export type HttpMatchersPath = string[];
/**
 * protocol: string
 * Module: http.matchers.protocol
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchProtocol
 * MatchProtocol matches requests by protocol. Recognized values are
 * "http", "https", and "grpc" for broad protocol matches, or specific
 * HTTP versions can be specified like so: "http/1", "http/1.1",
 * "http/2", "http/3", or minimum versions: "http/2+", etc.
 *
 *
 */
export type HttpMatchersProtocol = string;
/**
 * not: array
 * Module: http.matchers.not
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchNot
 * MatchNot matches requests by negating the results of its matcher
 * sets. A single "not" matcher takes one or more matcher sets. Each
 * matcher set is OR'ed; in other words, if any matcher set returns
 * true, the final result of the "not" matcher is false. Individual
 * matchers within a set work the same (i.e. different matchers in
 * the same set are AND'ed).
 *
 * NOTE: The generated docs which describe the structure of this
 * module are wrong because of how this type unmarshals JSON in a
 * custom way. The correct structure is:
 *
 * ```json
 * [
 * 	{},
 * 	{}
 * ]
 * ```
 *
 * where each of the array elements is a matcher set, i.e. an
 * object keyed by matcher name.
 *
 *
 */
export type HttpMatchersNot = {
  expression?: HttpMatchersExpression;
  file?: HttpMatchersFile;
  header?: HttpMatchersHeader;
  header_regexp?: HttpMatchersHeaderRegexp;
  host?: HttpMatchersHost;
  method?: HttpMatchersMethod;
  not?: HttpMatchersNot;
  path?: HttpMatchersPath;
  path_regexp?: HttpMatchersPathRegexp;
  protocol?: HttpMatchersProtocol;
  query?: HttpMatchersQuery;
  remote_ip?: HttpMatchersRemoteIp;
  vars?: HttpMatchersVars;
  vars_regexp?: HttpMatchersVarsRegexp;
  [k: string]: unknown;
}[];
/**
 * sni: array
 * Module: tls.handshake_match.sni
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#MatchServerName
 * MatchServerName matches based on SNI. Names in
 * this list may use left-most-label wildcards,
 * similar to wildcard certificates.
 *
 *
 */
export type TlsHandshakeMatchSni = string[];
/**
 * automate: array
 * Module: tls.certificates.automate
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#AutomateLoader
 * AutomateLoader will automatically manage certificates for the names in the
 * list, including obtaining and renewing certificates. Automated certificates
 * are managed according to their matching automation policy, configured
 * elsewhere in this app.
 *
 * Technically, this is a no-op certificate loader module that is treated as
 * a special case: it uses this app's automation features to load certificates
 * for the list of hostnames, rather than loading certificates manually. But
 * the end result is the same: certificates for these subject names will be
 * loaded into the in-memory cache and may then be used.
 *
 *
 */
export type TlsCertificatesAutomate = string[];
/**
 * load_files: array
 * Module: tls.certificates.load_files
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#CertKeyFilePair
 * CertKeyFilePair pairs certificate and key file names along with their
 * encoding format so that they can be loaded from disk.
 *
 *
 */
export type TlsCertificatesLoadFiles = {
  /**
   * certificate: string
   * Module: tls.certificates.load_files
   * Path to the certificate (public key) file.
   *
   */
  certificate?: string;
  /**
   * format: string
   * Module: tls.certificates.load_files
   * The format of the cert and key. Can be "pem". Default: "pem"
   *
   */
  format?: string;
  /**
   * key: string
   * Module: tls.certificates.load_files
   * Path to the private key file.
   *
   */
  key?: string;
  /**
   * tags: array
   * Module: tls.certificates.load_files
   * Arbitrary values to associate with this certificate.
   * Can be useful when you want to select a particular
   * certificate when there may be multiple valid candidates.
   *
   */
  tags?: string[];
  [k: string]: unknown;
}[];
/**
 * load_folders: array
 * Module: tls.certificates.load_folders
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#FolderLoader
 * FolderLoader loads certificates and their associated keys from disk
 * by recursively walking the specified directories, looking for PEM
 * files which contain both a certificate and a key.
 *
 *
 */
export type TlsCertificatesLoadFolders = string[];
/**
 * load_pem: array
 * Module: tls.certificates.load_pem
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#CertKeyPEMPair
 * CertKeyPEMPair pairs certificate and key PEM blocks.
 *
 *
 */
export type TlsCertificatesLoadPem = {
  /**
   * certificate: string
   * Module: tls.certificates.load_pem
   * The certificate (public key) in PEM format.
   *
   */
  certificate?: string;
  /**
   * key: string
   * Module: tls.certificates.load_pem
   * The private key in PEM format.
   *
   */
  key?: string;
  /**
   * tags: array
   * Module: tls.certificates.load_pem
   * Arbitrary values to associate with this certificate.
   * Can be useful when you want to select a particular
   * certificate when there may be multiple valid candidates.
   *
   */
  tags?: string[];
  [k: string]: unknown;
}[];

/**
 * : object
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Config
 * Config is the top (or beginning) of the Caddy configuration structure.
 * Caddy config is expressed natively as a JSON document. If you prefer
 * not to work with JSON directly, there are [many config adapters](/docs/config-adapters)
 * available that can convert various inputs into Caddy JSON.
 *
 * Many parts of this config are extensible through the use of Caddy modules.
 * Fields which have a json.RawMessage type and which appear as dots (•••) in
 * the online docs can be fulfilled by modules in a certain module
 * namespace. The docs show which modules can be used in a given place.
 *
 * Whenever a module is used, its name must be given either inline as part of
 * the module, or as the key to the module's value. The docs will make it clear
 * which to use.
 *
 * Generally, all config settings are optional, as it is Caddy convention to
 * have good, documented default values. If a parameter is required, the docs
 * should say so.
 *
 * Go programs which are directly building a Config struct value should take
 * care to populate the JSON-encodable fields of the struct (i.e. the fields
 * with `json` struct tags) if employing the module lifecycle (e.g. Provision
 * method calls).
 *
 *
 */
export interface CaddyV2AutogeneratedJSONSchemaHttpsGithubComAbiosoftCaddyJsonSchema {
  /**
   * admin: object
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2#AdminConfig
   * AdminConfig configures Caddy's API endpoint, which is used
   * to manage Caddy while it is running.
   *
   *
   */
  admin?: {
    /**
     * config: object
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2#ConfigSettings
     * Options pertaining to configuration management.
     *
     *
     * ConfigSettings configures the management of configuration.
     *
     */
    config?: {
      /**
       * load: object
       * Module: caddy.config_loaders
       * Loads a configuration to use. This is helpful if your configs are
       * managed elsewhere, and you want Caddy to pull its config dynamically
       * when it starts. The pulled config completely replaces the current
       * one, just like any other config load. It is an error if a pulled
       * config is configured to pull another config.
       *
       * EXPERIMENTAL: Subject to change.
       *
       */
      load?: {
        [k: string]: unknown;
      } & {
        /**
         * key to identify load module.
         * module: string
         * Module: caddy.config_loaders
         */
        module?: "http";
        [k: string]: unknown;
      };
      /**
       * persist: boolean
       * Whether to keep a copy of the active config on disk. Default is true.
       * Note that "pulled" dynamic configs (using the neighboring "load" module)
       * are not persisted; only configs that are pushed to Caddy get persisted.
       *
       */
      persist?: boolean;
      [k: string]: unknown;
    };
    /**
     * disabled: boolean
     * If true, the admin endpoint will be completely disabled.
     * Note that this makes any runtime changes to the config
     * impossible, since the interface to do so is through the
     * admin endpoint.
     *
     */
    disabled?: boolean;
    /**
     * enforce_origin: boolean
     * If true, CORS headers will be emitted, and requests to the
     * API will be rejected if their `Host` and `Origin` headers
     * do not match the expected value(s). Use `origins` to
     * customize which origins/hosts are allowed. If `origins` is
     * not set, the listen address is the only value allowed by
     * default. Enforced only on local (plaintext) endpoint.
     *
     */
    enforce_origin?: boolean;
    /**
     * identity: object
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2#IdentityConfig
     * Options that establish this server's identity. Identity refers to
     * credentials which can be used to uniquely identify and authenticate
     * this server instance. This is required if remote administration is
     * enabled (but does not require remote administration to be enabled).
     * Default: no identity management.
     *
     *
     * IdentityConfig configures management of this server's identity. An identity
     * consists of credentials that uniquely verify this instance; for example,
     * TLS certificates (public + private key pairs).
     *
     */
    identity?: {
      /**
       * identifiers: array
       * List of names or IP addresses which refer to this server.
       * Certificates will be obtained for these identifiers so
       * secure TLS connections can be made using them.
       *
       */
      identifiers?: string[];
      /**
       * issuers: array
       * Module: tls.issuance
       * Issuers that can provide this admin endpoint its identity
       * certificate(s). Default: ACME issuers configured for
       * ZeroSSL and Let's Encrypt. Be sure to change this if you
       * require credentials for private identifiers.
       *
       */
      issuers?: ({
        [k: string]: unknown;
      } & {
        [k: string]: unknown;
      } & {
        [k: string]: unknown;
      } & {
        /**
         * key to identify issuers module.
         * module: string
         * Module: tls.issuance
         */
        module?: "zerossl" | "acme" | "internal";
        [k: string]: unknown;
      })[];
      [k: string]: unknown;
    };
    /**
     * listen: string
     * The address to which the admin endpoint's listener should
     * bind itself. Can be any single network address that can be
     * parsed by Caddy. Default: localhost:2019
     *
     */
    listen?: string;
    /**
     * origins: array
     * The list of allowed origins/hosts for API requests. Only needed
     * if accessing the admin endpoint from a host different from the
     * socket's network interface or if `enforce_origin` is true. If not
     * set, the listener address will be the default value. If set but
     * empty, no origins will be allowed. Enforced only on local
     * (plaintext) endpoint.
     *
     */
    origins?: string[];
    /**
     * remote: object
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2#RemoteAdmin
     * Options pertaining to remote administration. By default, remote
     * administration is disabled. If enabled, identity management must
     * also be configured, as that is how the endpoint is secured.
     * See the neighboring "identity" object.
     *
     * EXPERIMENTAL: This feature is subject to change.
     *
     *
     * RemoteAdmin enables and configures remote administration. If enabled,
     * a secure listener enforcing mutual TLS authentication will be started
     * on a different port from the standard plaintext admin server.
     *
     * This endpoint is secured using identity management, which must be
     * configured separately (because identity management does not depend
     * on remote administration). See the admin/identity config struct.
     *
     * EXPERIMENTAL: Subject to change.
     *
     */
    remote?: {
      /**
       * access_control: array
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2#AdminAccess
       * List of access controls for this secure admin endpoint.
       * This configures TLS mutual authentication (i.e. authorized
       * client certificates), but also application-layer permissions
       * like which paths and methods each identity is authorized for.
       *
       *
       * AdminAccess specifies what permissions an identity or group
       * of identities are granted.
       *
       */
      access_control?: {
        /**
         * permissions: array
         * https://pkg.go.dev/github.com/caddyserver/caddy/v2#AdminPermissions
         * Limits what the associated identities are allowed to do.
         * If unspecified, all permissions are granted.
         *
         *
         * AdminPermissions specifies what kinds of requests are allowed
         * to be made to the admin endpoint.
         *
         */
        permissions?: {
          /**
           * methods: array
           * The HTTP methods allowed for the given paths.
           *
           */
          methods?: string[];
          /**
           * paths: array
           * The API paths allowed. Paths are simple prefix matches.
           * Any subpath of the specified paths will be allowed.
           *
           */
          paths?: string[];
          [k: string]: unknown;
        }[];
        /**
         * public_keys: array
         * Base64-encoded DER certificates containing public keys to accept.
         * (The contents of PEM certificate blocks are base64-encoded DER.)
         * Any of these public keys can appear in any part of a verified chain.
         *
         */
        public_keys?: string[];
        [k: string]: unknown;
      }[];
      /**
       * listen: string
       * The address on which to start the secure listener.
       * Default: :2021
       *
       */
      listen?: string;
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  /**
   * apps: object
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2#ModuleMap
   * AppsRaw are the apps that Caddy will load and run. The
   * app module name is the key, and the app's config is the
   * associated value.
   *
   *
   * ModuleMap is a map that can contain multiple modules,
   * where the map key is the module's name. (The namespace
   * is usually read from an associated field's struct tag.)
   * Because the module's name is given as the key in a
   * module map, the name does not have to be given in the
   * json.RawMessage.
   *
   */
  apps?: {
    http?: Http;
    pki?: Pki;
    tls?: Tls;
    [k: string]: unknown;
  };
  /**
   * logging: object
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Logging
   * Logging facilitates logging within Caddy. The default log is
   * called "default" and you can customize it. You can also define
   * additional logs.
   *
   * By default, all logs at INFO level and higher are written to
   * standard error ("stderr" writer) in a human-readable format
   * ("console" encoder if stdout is an interactive terminal, "json"
   * encoder otherwise).
   *
   * All defined logs accept all log entries by default, but you
   * can filter by level and module/logger names. A logger's name
   * is the same as the module's name, but a module may append to
   * logger names for more specificity. For example, you can
   * filter logs emitted only by HTTP handlers using the name
   * "http.handlers", because all HTTP handler module names have
   * that prefix.
   *
   * Caddy logs (except the sink) are zero-allocation, so they are
   * very high-performing in terms of memory and CPU time. Enabling
   * sampling can further increase throughput on extremely high-load
   * servers.
   *
   *
   */
  logging?: {
    /**
     * logs: object
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2#CustomLog
     * Logs are your logs, keyed by an arbitrary name of your
     * choosing. The default log can be customized by defining
     * a log called "default". You can further define other logs
     * and filter what kinds of entries they accept.
     *
     *
     * CustomLog represents a custom logger configuration.
     *
     * By default, a log will emit all log entries. Some entries
     * will be skipped if sampling is enabled. Further, the Include
     * and Exclude parameters define which loggers (by name) are
     * allowed or rejected from emitting in this log. If both Include
     * and Exclude are populated, their values must be mutually
     * exclusive, and longer namespaces have priority. If neither
     * are populated, all logs are emitted.
     *
     */
    logs?: {
      /**
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2#CustomLog
       * Logs are your logs, keyed by an arbitrary name of your
       * choosing. The default log can be customized by defining
       * a log called "default". You can further define other logs
       * and filter what kinds of entries they accept.
       *
       *
       * CustomLog represents a custom logger configuration.
       *
       * By default, a log will emit all log entries. Some entries
       * will be skipped if sampling is enabled. Further, the Include
       * and Exclude parameters define which loggers (by name) are
       * allowed or rejected from emitting in this log. If both Include
       * and Exclude are populated, their values must be mutually
       * exclusive, and longer namespaces have priority. If neither
       * are populated, all logs are emitted.
       *
       */
      [k: string]: {
        /**
         * encoder: object
         * Module: caddy.logging.encoders
         * The encoder is how the log entries are formatted or encoded.
         *
         */
        encoder?: {
          [k: string]: unknown;
        } & {
          /**
           * key to identify encoder module.
           * format: string
           * Module: caddy.logging.encoders
           */
          format?: "console" | "filter" | "json" | "single_field";
          [k: string]: unknown;
        };
        /**
         * exclude: array
         * Exclude defines the names of loggers that should be
         * skipped by this log. For example, to exclude only
         * HTTP access logs, you would exclude "http.log.access".
         *
         */
        exclude?: string[];
        /**
         * include: array
         * Include defines the names of loggers to emit in this
         * log. For example, to include only logs emitted by the
         * admin API, you would include "admin.api".
         *
         */
        include?: string[];
        /**
         * level: string
         * Level is the minimum level to emit, and is inclusive.
         * Possible levels: DEBUG, INFO, WARN, ERROR, PANIC, and FATAL
         *
         */
        level?: string;
        /**
         * sampling: object
         * https://pkg.go.dev/github.com/caddyserver/caddy/v2#LogSampling
         * Sampling configures log entry sampling. If enabled,
         * only some log entries will be emitted. This is useful
         * for improving performance on extremely high-pressure
         * servers.
         *
         *
         * LogSampling configures log entry sampling.
         *
         */
        sampling?: {
          /**
           * first: number
           * Log this many entries within a given level and
           * message for each interval.
           *
           */
          first?: number;
          /**
           * interval: number
           * https://pkg.go.dev/time#Duration
           * The window over which to conduct sampling.
           *
           *
           * A Duration represents the elapsed time between two instants
           * as an int64 nanosecond count. The representation limits the
           * largest representable duration to approximately 290 years.
           *
           */
          interval?: number;
          /**
           * thereafter: number
           * If more entries with the same level and message
           * are seen during the same interval, keep one in
           * this many entries until the end of the interval.
           *
           */
          thereafter?: number;
          [k: string]: unknown;
        };
        /**
         * writer: object
         * Module: caddy.logging.writers
         * The writer defines where log entries are emitted.
         *
         */
        writer?: {
          [k: string]: unknown;
        } & {
          /**
           * key to identify writer module.
           * output: string
           * Module: caddy.logging.writers
           */
          output?: "discard" | "file" | "net" | "stderr" | "stdout";
          [k: string]: unknown;
        };
        [k: string]: unknown;
      };
    };
    /**
     * sink: object
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2#StandardLibLog
     * Sink is the destination for all unstructured logs emitted
     * from Go's standard library logger. These logs are common
     * in dependencies that are not designed specifically for use
     * in Caddy. Because it is global and unstructured, the sink
     * lacks most advanced features and customizations.
     *
     *
     * StandardLibLog configures the default Go standard library
     * global logger in the log package. This is necessary because
     * module dependencies which are not built specifically for
     * Caddy will use the standard logger. This is also known as
     * the "sink" logger.
     *
     */
    sink?: {
      /**
       * writer: object
       * Module: caddy.logging.writers
       * The module that writes out log entries for the sink.
       *
       */
      writer?: {
        [k: string]: unknown;
      } & {
        /**
         * key to identify writer module.
         * output: string
         * Module: caddy.logging.writers
         */
        output?: "discard" | "file" | "net" | "stderr" | "stdout";
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
    [k: string]: unknown;
  };
  /**
   * storage: object
   * Module: caddy.storage
   * StorageRaw is a storage module that defines how/where Caddy
   * stores assets (such as TLS certificates). The default storage
   * module is `caddy.storage.file_system` (the local file system),
   * and the default path
   * [depends on the OS and environment](/docs/conventions#data-directory).
   *
   */
  storage?: {
    [k: string]: unknown;
  } & {
    /**
     * key to identify storage module.
     * module: string
     * Module: caddy.storage
     */
    module?: "file_system";
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * http: object
 * Module: http
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#App
 * App is a robust, production-ready HTTP server.
 *
 * HTTPS is enabled by default if host matchers with qualifying names are used
 * in any of routes; certificates are automatically provisioned and renewed.
 * Additionally, automatic HTTPS will also enable HTTPS for servers that listen
 * only on the HTTPS port but which do not have any TLS connection policies
 * defined by adding a good, default TLS connection policy.
 *
 * In HTTP routes, additional placeholders are available (replace any `*`):
 *
 * Placeholder | Description
 * ------------|---------------
 * `{http.request.body}` | The request body (⚠️ inefficient; use only for debugging)
 * `{http.request.cookie.*}` | HTTP request cookie
 * `{http.request.duration}` | Time up to now spent handling the request (after decoding headers from client)
 * `{http.request.duration_ms}` | Same as 'duration', but in milliseconds.
 * `{http.request.uuid}` | The request unique identifier
 * `{http.request.header.*}` | Specific request header field
 * `{http.request.host}` | The host part of the request's Host header
 * `{http.request.host.labels.*}` | Request host labels (0-based from right); e.g. for foo.example.com: 0=com, 1=example, 2=foo
 * `{http.request.hostport}` | The host and port from the request's Host header
 * `{http.request.method}` | The request method
 * `{http.request.orig_method}` | The request's original method
 * `{http.request.orig_uri}` | The request's original URI
 * `{http.request.orig_uri.path}` | The request's original path
 * `{http.request.orig_uri.path.*}` | Parts of the original path, split by `/` (0-based from left)
 * `{http.request.orig_uri.path.dir}` | The request's original directory
 * `{http.request.orig_uri.path.file}` | The request's original filename
 * `{http.request.orig_uri.query}` | The request's original query string (without `?`)
 * `{http.request.port}` | The port part of the request's Host header
 * `{http.request.proto}` | The protocol of the request
 * `{http.request.local.host}` | The host (IP) part of the local address the connection arrived on
 * `{http.request.local.port}` | The port part of the local address the connection arrived on
 * `{http.request.local}` | The local address the connection arrived on
 * `{http.request.remote.host}` | The host (IP) part of the remote client's address
 * `{http.request.remote.port}` | The port part of the remote client's address
 * `{http.request.remote}` | The address of the remote client
 * `{http.request.scheme}` | The request scheme, typically `http` or `https`
 * `{http.request.tls.version}` | The TLS version name
 * `{http.request.tls.cipher_suite}` | The TLS cipher suite
 * `{http.request.tls.resumed}` | The TLS connection resumed a previous connection
 * `{http.request.tls.proto}` | The negotiated next protocol
 * `{http.request.tls.proto_mutual}` | The negotiated next protocol was advertised by the server
 * `{http.request.tls.server_name}` | The server name requested by the client, if any
 * `{http.request.tls.client.fingerprint}` | The SHA256 checksum of the client certificate
 * `{http.request.tls.client.public_key}` | The public key of the client certificate.
 * `{http.request.tls.client.public_key_sha256}` | The SHA256 checksum of the client's public key.
 * `{http.request.tls.client.certificate_pem}` | The PEM-encoded value of the certificate.
 * `{http.request.tls.client.certificate_der_base64}` | The base64-encoded value of the certificate.
 * `{http.request.tls.client.issuer}` | The issuer DN of the client certificate
 * `{http.request.tls.client.serial}` | The serial number of the client certificate
 * `{http.request.tls.client.subject}` | The subject DN of the client certificate
 * `{http.request.tls.client.san.dns_names.*}` | SAN DNS names(index optional)
 * `{http.request.tls.client.san.emails.*}` | SAN email addresses (index optional)
 * `{http.request.tls.client.san.ips.*}` | SAN IP addresses (index optional)
 * `{http.request.tls.client.san.uris.*}` | SAN URIs (index optional)
 * `{http.request.uri}` | The full request URI
 * `{http.request.uri.path}` | The path component of the request URI
 * `{http.request.uri.path.*}` | Parts of the path, split by `/` (0-based from left)
 * `{http.request.uri.path.dir}` | The directory, excluding leaf filename
 * `{http.request.uri.path.file}` | The filename of the path, excluding directory
 * `{http.request.uri.query}` | The query string (without `?`)
 * `{http.request.uri.query.*}` | Individual query string value
 * `{http.response.header.*}` | Specific response header field
 * `{http.vars.*}` | Custom variables in the HTTP handler chain
 * `{http.shutting_down}` | True if the HTTP app is shutting down
 * `{http.time_until_shutdown}` | Time until HTTP server shutdown, if scheduled
 *
 *
 */
export interface Http {
  /**
   * grace_period: number
   * Module: http
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
   * GracePeriod is how long to wait for active connections when shutting
   * down the servers. During the grace period, no new connections are
   * accepted, idle connections are closed, and active connections will
   * be given the full length of time to become idle and close.
   * Once the grace period is over, connections will be forcefully closed.
   * If zero, the grace period is eternal. Default: 0.
   *
   *
   * Duration can be an integer or a string. An integer is
   * interpreted as nanoseconds. If a string, it is a Go
   * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
   * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
   *
   */
  grace_period?: number;
  /**
   * http_port: number
   * Module: http
   * HTTPPort specifies the port to use for HTTP (as opposed to HTTPS),
   * which is used when setting up HTTP->HTTPS redirects or ACME HTTP
   * challenge solvers. Default: 80.
   *
   */
  http_port?: number;
  /**
   * https_port: number
   * Module: http
   * HTTPSPort specifies the port to use for HTTPS, which is used when
   * solving the ACME TLS-ALPN challenges, or whenever HTTPS is needed
   * but no specific port number is given. Default: 443.
   *
   */
  https_port?: number;
  /**
   * servers: object
   * Module: http
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#Server
   * Servers is the list of servers, keyed by arbitrary names chosen
   * at your discretion for your own convenience; the keys do not
   * affect functionality.
   *
   *
   * Server describes an HTTP server.
   *
   */
  servers?: {
    /**
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#Server
     * Servers is the list of servers, keyed by arbitrary names chosen
     * at your discretion for your own convenience; the keys do not
     * affect functionality.
     *
     *
     * Server describes an HTTP server.
     *
     */
    [k: string]: {
      /**
       * allow_h2c: boolean
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#App
       */
      allow_h2c?: boolean;
      /**
       * automatic_https: object
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#AutoHTTPSConfig
       * AutoHTTPS configures or disables automatic HTTPS within this server.
       * HTTPS is enabled automatically and by default when qualifying names
       * are present in a Host matcher and/or when the server is listening
       * only on the HTTPS port.
       *
       *
       * AutoHTTPSConfig is used to disable automatic HTTPS
       * or certain aspects of it for a specific server.
       * HTTPS is enabled automatically and by default when
       * qualifying hostnames are available from the config.
       *
       */
      automatic_https?: {
        /**
         * disable: boolean
         * Module: http
         * If true, automatic HTTPS will be entirely disabled,
         * including certificate management and redirects.
         *
         */
        disable?: boolean;
        /**
         * disable_redirects: boolean
         * Module: http
         * If true, only automatic HTTP->HTTPS redirects will
         * be disabled, but other auto-HTTPS features will
         * remain enabled.
         *
         */
        disable_redirects?: boolean;
        /**
         * ignore_loaded_certificates: boolean
         * Module: http
         * By default, automatic HTTPS will obtain and renew
         * certificates for qualifying hostnames. However, if
         * a certificate with a matching SAN is already loaded
         * into the cache, certificate management will not be
         * enabled. To force automated certificate management
         * regardless of loaded certificates, set this to true.
         *
         */
        ignore_loaded_certificates?: boolean;
        /**
         * skip: array
         * Module: http
         * Hosts/domain names listed here will not be included
         * in automatic HTTPS (they will not have certificates
         * loaded nor redirects applied).
         *
         */
        skip?: string[];
        /**
         * skip_certificates: array
         * Module: http
         * Hosts/domain names listed here will still be enabled
         * for automatic HTTPS (unless in the Skip list), except
         * that certificates will not be provisioned and managed
         * for these names.
         *
         */
        skip_certificates?: string[];
        [k: string]: unknown;
      };
      /**
       * errors: object
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#HTTPErrorConfig
       * Errors is how this server will handle errors returned from any
       * of the handlers in the primary routes. If the primary handler
       * chain returns an error, the error along with its recommended
       * status code are bubbled back up to the HTTP server which
       * executes a separate error route, specified using this property.
       * The error routes work exactly like the normal routes.
       *
       *
       * HTTPErrorConfig determines how to handle errors
       * from the HTTP handlers.
       *
       */
      errors?: {
        /**
         * routes: array
         * Module: http
         * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#Route
         * The routes to evaluate after the primary handler
         * chain returns an error. In an error route, extra
         * placeholders are available:
         *
         * Placeholder | Description
         * ------------|---------------
         * `{http.error.status_code}` | The recommended HTTP status code
         * `{http.error.status_text}` | The status text associated with the recommended status code
         * `{http.error.message}`     | The error message
         * `{http.error.trace}`       | The origin of the error
         * `{http.error.id}`          | An identifier for this occurrence of the error
         *
         *
         * Route consists of a set of rules for matching HTTP requests,
         * a list of handlers to execute, and optional flow control
         * parameters which customize the handling of HTTP requests
         * in a highly flexible and performant manner.
         *
         */
        routes?: {
          /**
           * group: string
           * Module: http
           * Group is an optional name for a group to which this
           * route belongs. Grouping a route makes it mutually
           * exclusive with others in its group; if a route belongs
           * to a group, only the first matching route in that group
           * will be executed.
           *
           */
          group?: string;
          /**
           * handle: array
           * Module: http.handlers
           * The list of handlers for this route. Upon matching a request, they are chained
           * together in a middleware fashion: requests flow from the first handler to the last
           * (top of the list to the bottom), with the possibility that any handler could stop
           * the chain and/or return an error. Responses flow back through the chain (bottom of
           * the list to the top) as they are written out to the client.
           *
           * Not all handlers call the next handler in the chain. For example, the reverse_proxy
           * handler always sends a request upstream or returns an error. Thus, configuring
           * handlers after reverse_proxy in the same route is illogical, since they would never
           * be executed. You will want to put handlers which originate the response at the very
           * end of your route(s). The documentation for a module should state whether it invokes
           * the next handler, but sometimes it is common sense.
           *
           * Some handlers manipulate the response. Remember that requests flow down the list, and
           * responses flow up the list.
           *
           * For example, if you wanted to use both `templates` and `encode` handlers, you would
           * need to put `templates` after `encode` in your route, because responses flow up.
           * Thus, `templates` will be able to parse and execute the plain-text response as a
           * template, and then return it up to the `encode` handler which will then compress it
           * into a binary format.
           *
           * If `templates` came before `encode`, then `encode` would write a compressed,
           * binary-encoded response to `templates` which would not be able to parse the response
           * properly.
           *
           * The correct order, then, is this:
           *
           *     [
           *         {"handler": "encode"},
           *         {"handler": "templates"},
           *         {"handler": "file_server"}
           *     ]
           *
           * The request flows ⬇️ DOWN (`encode` -> `templates` -> `file_server`).
           *
           * 1. First, `encode` will choose how to `encode` the response and wrap the response.
           * 2. Then, `templates` will wrap the response with a buffer.
           * 3. Finally, `file_server` will originate the content from a file.
           *
           * The response flows ⬆️ UP (`file_server` -> `templates` -> `encode`):
           *
           * 1. First, `file_server` will write the file to the response.
           * 2. That write will be buffered and then executed by `templates`.
           * 3. Lastly, the write from `templates` will flow into `encode` which will compress the stream.
           *
           * If you think of routes in this way, it will be easy and even fun to solve the puzzle of writing correct routes.
           *
           */
          handle?: ({
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            [k: string]: unknown;
          } & {
            /**
             * key to identify handle module.
             * handler: string
             * Module: http.handlers
             */
            handler?:
              | "acme_server"
              | "encode"
              | "subroute"
              | "rewrite"
              | "static_response"
              | "templates"
              | "vars"
              | "headers"
              | "map"
              | "metrics"
              | "reverse_proxy"
              | "authentication"
              | "error"
              | "file_server"
              | "push"
              | "request_body";
            [k: string]: unknown;
          })[];
          /**
           * match: array
           * Module: http.matchers
           * https://pkg.go.dev/github.com/caddyserver/caddy/v2#ModuleMap
           * The matcher sets which will be used to qualify this
           * route for a request (essentially the "if" statement
           * of this route). Each matcher set is OR'ed, but matchers
           * within a set are AND'ed together.
           *
           *
           * ModuleMap is a map that can contain multiple modules,
           * where the map key is the module's name. (The namespace
           * is usually read from an associated field's struct tag.)
           * Because the module's name is given as the key in a
           * module map, the name does not have to be given in the
           * json.RawMessage.
           *
           */
          match?: {
            expression?: HttpMatchersExpression;
            file?: HttpMatchersFile;
            header?: HttpMatchersHeader;
            header_regexp?: HttpMatchersHeaderRegexp;
            host?: HttpMatchersHost;
            method?: HttpMatchersMethod;
            not?: HttpMatchersNot;
            path?: HttpMatchersPath;
            path_regexp?: HttpMatchersPathRegexp;
            protocol?: HttpMatchersProtocol;
            query?: HttpMatchersQuery;
            remote_ip?: HttpMatchersRemoteIp;
            vars?: HttpMatchersVars;
            vars_regexp?: HttpMatchersVarsRegexp;
            [k: string]: unknown;
          }[];
          /**
           * terminal: boolean
           * Module: http
           * If true, no more routes will be executed after this one.
           *
           */
          terminal?: boolean;
          [k: string]: unknown;
        }[];
        [k: string]: unknown;
      };
      /**
       * experimental_http3: boolean
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#App
       */
      experimental_http3?: boolean;
      /**
       * idle_timeout: number
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
       * IdleTimeout is the maximum time to wait for the next request
       * when keep-alives are enabled. If zero, a default timeout of
       * 5m is applied to help avoid resource exhaustion.
       *
       *
       * Duration can be an integer or a string. An integer is
       * interpreted as nanoseconds. If a string, it is a Go
       * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
       * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
       *
       */
      idle_timeout?: number;
      /**
       * listen: array
       * Module: http
       * Socket addresses to which to bind listeners. Accepts
       * [network addresses](/docs/conventions#network-addresses)
       * that may include port ranges. Listener addresses must
       * be unique; they cannot be repeated across all defined
       * servers.
       *
       */
      listen?: string[];
      /**
       * listener_wrappers: array
       * Module: caddy.listeners
       * A list of listener wrapper modules, which can modify the behavior
       * of the base listener. They are applied in the given order.
       *
       */
      listener_wrappers?: ({
        [k: string]: unknown;
      } & {
        /**
         * key to identify listener_wrappers module.
         * wrapper: string
         * Module: caddy.listeners
         */
        wrapper?: "tls";
        [k: string]: unknown;
      })[];
      /**
       * logs: object
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#ServerLogConfig
       * Enables access logging and configures how access logs are handled
       * in this server. To minimally enable access logs, simply set this
       * to a non-null, empty struct.
       *
       *
       * ServerLogConfig describes a server's logging configuration. If
       * enabled without customization, all requests to this server are
       * logged to the default logger; logger destinations may be
       * customized per-request-host.
       *
       */
      logs?: {
        /**
         * default_logger_name: string
         * Module: http
         * The default logger name for all logs emitted by this server for
         * hostnames that are not in the logger_names map.
         *
         */
        default_logger_name?: string;
        /**
         * logger_names: object
         * Module: http
         * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#StringArray
         * LoggerNames maps request hostnames to one or more custom logger
         * names. For example, a mapping of `"example.com": ["example"]` would
         * cause access logs from requests with a Host of example.com to be
         * emitted by a logger named "http.log.access.example". If there are
         * multiple logger names, then the log will be emitted to all of them.
         * If the logger name is an empty, the default logger is used, i.e.
         * the logger "http.log.access".
         *
         * Keys must be hostnames (without ports), and may contain wildcards
         * to match subdomains. The value is an array of logger names.
         *
         * For backwards compatibility, if the value is a string, it is treated
         * as a single-element array.
         *
         *
         * StringArray is a slices of strings, but also accepts
         * a single string as a value when JSON unmarshaling,
         * converting it to a slice of one string.
         *
         */
        logger_names?: {
          /**
           * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#StringArray
           * LoggerNames maps request hostnames to one or more custom logger
           * names. For example, a mapping of `"example.com": ["example"]` would
           * cause access logs from requests with a Host of example.com to be
           * emitted by a logger named "http.log.access.example". If there are
           * multiple logger names, then the log will be emitted to all of them.
           * If the logger name is an empty, the default logger is used, i.e.
           * the logger "http.log.access".
           *
           * Keys must be hostnames (without ports), and may contain wildcards
           * to match subdomains. The value is an array of logger names.
           *
           * For backwards compatibility, if the value is a string, it is treated
           * as a single-element array.
           *
           *
           * StringArray is a slices of strings, but also accepts
           * a single string as a value when JSON unmarshaling,
           * converting it to a slice of one string.
           *
           */
          [k: string]: {
            [k: string]: unknown;
          };
        };
        /**
         * skip_hosts: array
         * Module: http
         * By default, all requests to this server will be logged if
         * access logging is enabled. This field lists the request
         * hosts for which access logging should be disabled.
         *
         */
        skip_hosts?: string[];
        /**
         * skip_unmapped_hosts: boolean
         * Module: http
         * If true, requests to any host not appearing in the
         * logger_names map will not be logged.
         *
         */
        skip_unmapped_hosts?: boolean;
        [k: string]: unknown;
      };
      /**
       * max_header_bytes: number
       * Module: http
       * MaxHeaderBytes is the maximum size to parse from a client's
       * HTTP request headers.
       *
       */
      max_header_bytes?: number;
      /**
       * read_header_timeout: number
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
       * ReadHeaderTimeout is like ReadTimeout but for request headers.
       *
       *
       * Duration can be an integer or a string. An integer is
       * interpreted as nanoseconds. If a string, it is a Go
       * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
       * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
       *
       */
      read_header_timeout?: number;
      /**
       * read_timeout: number
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
       * How long to allow a read from a client's upload. Setting this
       * to a short, non-zero value can mitigate slowloris attacks, but
       * may also affect legitimately slow clients.
       *
       *
       * Duration can be an integer or a string. An integer is
       * interpreted as nanoseconds. If a string, it is a Go
       * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
       * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
       *
       */
      read_timeout?: number;
      /**
       * routes: array
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#Route
       * Routes describes how this server will handle requests.
       * Routes are executed sequentially. First a route's matchers
       * are evaluated, then its grouping. If it matches and has
       * not been mutually-excluded by its grouping, then its
       * handlers are executed sequentially. The sequence of invoked
       * handlers comprises a compiled middleware chain that flows
       * from each matching route and its handlers to the next.
       *
       * By default, all unrouted requests receive a 200 OK response
       * to indicate the server is working.
       *
       *
       * Route consists of a set of rules for matching HTTP requests,
       * a list of handlers to execute, and optional flow control
       * parameters which customize the handling of HTTP requests
       * in a highly flexible and performant manner.
       *
       */
      routes?: {
        /**
         * group: string
         * Module: http
         * Group is an optional name for a group to which this
         * route belongs. Grouping a route makes it mutually
         * exclusive with others in its group; if a route belongs
         * to a group, only the first matching route in that group
         * will be executed.
         *
         */
        group?: string;
        /**
         * handle: array
         * Module: http.handlers
         * The list of handlers for this route. Upon matching a request, they are chained
         * together in a middleware fashion: requests flow from the first handler to the last
         * (top of the list to the bottom), with the possibility that any handler could stop
         * the chain and/or return an error. Responses flow back through the chain (bottom of
         * the list to the top) as they are written out to the client.
         *
         * Not all handlers call the next handler in the chain. For example, the reverse_proxy
         * handler always sends a request upstream or returns an error. Thus, configuring
         * handlers after reverse_proxy in the same route is illogical, since they would never
         * be executed. You will want to put handlers which originate the response at the very
         * end of your route(s). The documentation for a module should state whether it invokes
         * the next handler, but sometimes it is common sense.
         *
         * Some handlers manipulate the response. Remember that requests flow down the list, and
         * responses flow up the list.
         *
         * For example, if you wanted to use both `templates` and `encode` handlers, you would
         * need to put `templates` after `encode` in your route, because responses flow up.
         * Thus, `templates` will be able to parse and execute the plain-text response as a
         * template, and then return it up to the `encode` handler which will then compress it
         * into a binary format.
         *
         * If `templates` came before `encode`, then `encode` would write a compressed,
         * binary-encoded response to `templates` which would not be able to parse the response
         * properly.
         *
         * The correct order, then, is this:
         *
         *     [
         *         {"handler": "encode"},
         *         {"handler": "templates"},
         *         {"handler": "file_server"}
         *     ]
         *
         * The request flows ⬇️ DOWN (`encode` -> `templates` -> `file_server`).
         *
         * 1. First, `encode` will choose how to `encode` the response and wrap the response.
         * 2. Then, `templates` will wrap the response with a buffer.
         * 3. Finally, `file_server` will originate the content from a file.
         *
         * The response flows ⬆️ UP (`file_server` -> `templates` -> `encode`):
         *
         * 1. First, `file_server` will write the file to the response.
         * 2. That write will be buffered and then executed by `templates`.
         * 3. Lastly, the write from `templates` will flow into `encode` which will compress the stream.
         *
         * If you think of routes in this way, it will be easy and even fun to solve the puzzle of writing correct routes.
         *
         */
        handle?: ({
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          [k: string]: unknown;
        } & {
          /**
           * key to identify handle module.
           * handler: string
           * Module: http.handlers
           */
          handler?:
            | "authentication"
            | "error"
            | "file_server"
            | "push"
            | "request_body"
            | "acme_server"
            | "encode"
            | "subroute"
            | "headers"
            | "map"
            | "metrics"
            | "reverse_proxy"
            | "rewrite"
            | "static_response"
            | "templates"
            | "vars";
          [k: string]: unknown;
        })[];
        /**
         * match: array
         * Module: http.matchers
         * https://pkg.go.dev/github.com/caddyserver/caddy/v2#ModuleMap
         * The matcher sets which will be used to qualify this
         * route for a request (essentially the "if" statement
         * of this route). Each matcher set is OR'ed, but matchers
         * within a set are AND'ed together.
         *
         *
         * ModuleMap is a map that can contain multiple modules,
         * where the map key is the module's name. (The namespace
         * is usually read from an associated field's struct tag.)
         * Because the module's name is given as the key in a
         * module map, the name does not have to be given in the
         * json.RawMessage.
         *
         */
        match?: {
          expression?: HttpMatchersExpression;
          file?: HttpMatchersFile;
          header?: HttpMatchersHeader;
          header_regexp?: HttpMatchersHeaderRegexp;
          host?: HttpMatchersHost;
          method?: HttpMatchersMethod;
          not?: HttpMatchersNot;
          path?: HttpMatchersPath;
          path_regexp?: HttpMatchersPathRegexp;
          protocol?: HttpMatchersProtocol;
          query?: HttpMatchersQuery;
          remote_ip?: HttpMatchersRemoteIp;
          vars?: HttpMatchersVars;
          vars_regexp?: HttpMatchersVarsRegexp;
          [k: string]: unknown;
        }[];
        /**
         * terminal: boolean
         * Module: http
         * If true, no more routes will be executed after this one.
         *
         */
        terminal?: boolean;
        [k: string]: unknown;
      }[];
      /**
       * strict_sni_host: boolean
       * Module: http
       * If true, will require that a request's Host header match
       * the value of the ServerName sent by the client's TLS
       * ClientHello; often a necessary safeguard when using TLS
       * client authentication.
       *
       */
      strict_sni_host?: boolean;
      /**
       * tls_connection_policies: array
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#ConnectionPolicy
       * How to handle TLS connections. At least one policy is
       * required to enable HTTPS on this server if automatic
       * HTTPS is disabled or does not apply.
       *
       *
       * ConnectionPolicy specifies the logic for handling a TLS handshake.
       * An empty policy is valid; safe and sensible defaults will be used.
       *
       */
      tls_connection_policies?: {
        /**
         * alpn: array
         * Module: http
         * Protocols to use for Application-Layer Protocol
         * Negotiation (ALPN) during the handshake.
         *
         */
        alpn?: string[];
        /**
         * certificate_selection: object
         * Module: http
         * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#CustomCertSelectionPolicy
         * How to choose a certificate if more than one matched
         * the given ServerName (SNI) value.
         *
         *
         * CustomCertSelectionPolicy represents a policy for selecting the certificate
         * used to complete a handshake when there may be multiple options. All fields
         * specified must match the candidate certificate for it to be chosen.
         * This was needed to solve https://github.com/caddyserver/caddy/issues/2588.
         *
         */
        certificate_selection?: {
          /**
           * all_tags: array
           * Module: http
           * The certificate must have all of the tags in the list.
           *
           */
          all_tags?: string[];
          /**
           * any_tag: array
           * Module: http
           * The certificate must have at least one of the tags in the list.
           *
           */
          any_tag?: string[];
          /**
           * public_key_algorithm: number
           * Module: http
           * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#PublicKeyAlgorithm
           * The certificate must use this public key algorithm.
           *
           *
           * PublicKeyAlgorithm is a JSON-unmarshalable wrapper type.
           *
           */
          public_key_algorithm?: number;
          /**
           * serial_number: array
           * Module: http
           * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#bigInt
           * The certificate must have one of these serial numbers.
           *
           *
           * bigInt is a big.Int type that interops with JSON encodings as a string.
           *
           */
          serial_number?: {
            [k: string]: unknown;
          }[];
          /**
           * subject_organization: array
           * Module: http
           * The certificate must have one of these organization names.
           *
           */
          subject_organization?: string[];
          [k: string]: unknown;
        };
        /**
         * cipher_suites: array
         * Module: http
         * The list of cipher suites to support. Caddy's
         * defaults are modern and secure.
         *
         */
        cipher_suites?: string[];
        /**
         * client_authentication: object
         * Module: http
         * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#ClientAuthentication
         * Enables and configures TLS client authentication.
         *
         *
         * ClientAuthentication configures TLS client auth.
         *
         */
        client_authentication?: {
          /**
           * mode: string
           * Module: http
           * The mode for authenticating the client. Allowed values are:
           *
           * Mode | Description
           * -----|---------------
           * `request` | Ask clients for a certificate, but allow even if there isn't one; do not verify it
           * `require` | Require clients to present a certificate, but do not verify it
           * `verify_if_given` | Ask clients for a certificate; allow even if there isn't one, but verify it if there is
           * `require_and_verify` | Require clients to present a valid certificate that is verified
           *
           * The default mode is `require_and_verify` if any
           * TrustedCACerts or TrustedCACertPEMFiles or TrustedLeafCerts
           * are provided; otherwise, the default mode is `require`.
           *
           */
          mode?: string;
          /**
           * trusted_ca_certs: array
           * Module: http
           * DEPRECATED: Use the `ca` field with the `tls.ca_pool.source.inline` module instead.
           * A list of base64 DER-encoded CA certificates
           * against which to validate client certificates.
           * Client certs which are not signed by any of
           * these CAs will be rejected.
           *
           */
          trusted_ca_certs?: string[];
          /**
           * trusted_ca_certs_pem_files: array
           * Module: http
           * DEPRECATED: Use the `ca` field with the `tls.ca_pool.source.file` module instead.
           * TrustedCACertPEMFiles is a list of PEM file names
           * from which to load certificates of trusted CAs.
           * Client certificates which are not signed by any of
           * these CA certificates will be rejected.
           *
           */
          trusted_ca_certs_pem_files?: string[];
          /**
           * trusted_leaf_certs: array
           * Module: http
           * DEPRECATED: This field is deprecated and will be removed in
           * a future version. Please use the `validators` field instead
           * with the tls.client_auth.verifier.leaf module instead.
           *
           * A list of base64 DER-encoded client leaf certs
           * to accept. If this list is not empty, client certs
           * which are not in this list will be rejected.
           *
           */
          trusted_leaf_certs?: string[];
          [k: string]: unknown;
        };
        /**
         * curves: array
         * Module: http
         * The list of elliptic curves to support. Caddy's
         * defaults are modern and secure.
         *
         */
        curves?: string[];
        /**
         * default_sni: string
         * Module: http
         * DefaultSNI becomes the ServerName in a ClientHello if there
         * is no policy configured for the empty SNI value.
         *
         */
        default_sni?: string;
        /**
         * match: object
         * Module: tls.handshake_match
         * https://pkg.go.dev/github.com/caddyserver/caddy/v2#ModuleMap
         * How to match this policy with a TLS ClientHello. If
         * this policy is the first to match, it will be used.
         *
         *
         * ModuleMap is a map that can contain multiple modules,
         * where the map key is the module's name. (The namespace
         * is usually read from an associated field's struct tag.)
         * Because the module's name is given as the key in a
         * module map, the name does not have to be given in the
         * json.RawMessage.
         *
         */
        match?: {
          remote_ip?: TlsHandshakeMatchRemoteIp;
          sni?: TlsHandshakeMatchSni;
          [k: string]: unknown;
        };
        /**
         * protocol_max: string
         * Module: http
         * Maximum TLS protocol version to allow. Default: `tls1.3`
         *
         */
        protocol_max?: string;
        /**
         * protocol_min: string
         * Module: http
         * Minimum TLS protocol version to allow. Default: `tls1.2`
         *
         */
        protocol_min?: string;
        [k: string]: unknown;
      }[];
      /**
       * write_timeout: number
       * Module: http
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
       * WriteTimeout is how long to allow a write to a client. Note
       * that setting this to a small value when serving large files
       * may negatively affect legitimately slow clients.
       *
       *
       * Duration can be an integer or a string. An integer is
       * interpreted as nanoseconds. If a string, it is a Go
       * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
       * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
       *
       */
      write_timeout?: number;
      [k: string]: unknown;
    };
  };
  [k: string]: unknown;
}
/**
 * file: object
 * Module: http.matchers.file
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp/fileserver#MatchFile
 * MatchFile is an HTTP request matcher that can match
 * requests based upon file existence.
 *
 * Upon matching, three new placeholders will be made
 * available:
 *
 * - `{http.matchers.file.relative}` The root-relative
 * path of the file. This is often useful when rewriting
 * requests.
 * - `{http.matchers.file.absolute}` The absolute path
 * of the matched file.
 * - `{http.matchers.file.type}` Set to "directory" if
 * the matched file is a directory, "file" otherwise.
 * - `{http.matchers.file.remainder}` Set to the remainder
 * of the path if the path was split by `split_path`.
 *
 * Even though file matching may depend on the OS path
 * separator, the placeholder values always use /.
 *
 *
 */
export interface HttpMatchersFile {
  /**
   * root: string
   * Module: http.matchers.file
   * The root directory, used for creating absolute
   * file paths, and required when working with
   * relative paths; if not specified, `{http.vars.root}`
   * will be used, if set; otherwise, the current
   * directory is assumed. Accepts placeholders.
   *
   */
  root?: string;
  /**
   * split_path: array
   * Module: http.matchers.file
   * A list of delimiters to use to split the path in two
   * when trying files. If empty, no splitting will
   * occur, and the path will be tried as-is. For each
   * split value, the left-hand side of the split,
   * including the split value, will be the path tried.
   * For example, the path `/remote.php/dav/` using the
   * split value `.php` would try the file `/remote.php`.
   * Each delimiter must appear at the end of a URI path
   * component in order to be used as a split delimiter.
   *
   */
  split_path?: string[];
  /**
   * try_files: array
   * Module: http.matchers.file
   * The list of files to try. Each path here is
   * considered related to Root. If nil, the request
   * URL's path will be assumed. Files and
   * directories are treated distinctly, so to match
   * a directory, the filepath MUST end in a forward
   * slash `/`. To match a regular file, there must
   * be no trailing slash. Accepts placeholders. If
   * the policy is "first_exist", then an error may
   * be triggered as a fallback by configuring "="
   * followed by a status code number,
   * for example "=404".
   *
   */
  try_files?: string[];
  /**
   * try_policy: string
   * Module: http.matchers.file
   * How to choose a file in TryFiles. Can be:
   *
   * - first_exist
   * - smallest_size
   * - largest_size
   * - most_recently_modified
   *
   * Default is first_exist.
   *
   */
  try_policy?: string;
  [k: string]: unknown;
}
/**
 * header: object
 * Module: http.matchers.header
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchHeader
 * MatchHeader matches requests by header fields. The key is the field
 * name and the array is the list of field values. It performs fast,
 * exact string comparisons of the field values. Fast prefix, suffix,
 * and substring matches can also be done by suffixing, prefixing, or
 * surrounding the value with the wildcard `*` character, respectively.
 * If a list is null, the header must not exist. If the list is empty,
 * the field must simply exist, regardless of its value.
 *
 * **NOTE:** Notice that header values are arrays, not singular values. This is
 * because repeated fields are valid in headers, and each one may have a
 * different value. This matcher will match for a field if any one of its configured
 * values matches in the header. Backend applications relying on headers MUST take
 * into consideration that header field values are arrays and can have multiple
 * values.
 *
 *
 */
export interface HttpMatchersHeader {
  [k: string]: string[];
}
/**
 * header_regexp: object
 * Module: http.matchers.header_regexp
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchRegexp
 * MatchRegexp is an embedable type for matching
 * using regular expressions. It adds placeholders
 * to the request's replacer.
 *
 *
 */
export interface HttpMatchersHeaderRegexp {
  /**
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchRegexp
   * MatchRegexp is an embedable type for matching
   * using regular expressions. It adds placeholders
   * to the request's replacer.
   *
   *
   */
  [k: string]: {
    /**
     * name: string
     * Module: http.matchers.header_regexp
     * A unique name for this regular expression. Optional,
     * but useful to prevent overwriting captures from other
     * regexp matchers.
     *
     */
    name?: string;
    /**
     * pattern: string
     * Module: http.matchers.header_regexp
     * The regular expression to evaluate, in RE2 syntax,
     * which is the same general syntax used by Go, Perl,
     * and Python. For details, see
     * [Go's regexp package](https://golang.org/pkg/regexp/).
     * Captures are accessible via placeholders. Unnamed
     * capture groups are exposed as their numeric, 1-based
     * index, while named capture groups are available by
     * the capture group name.
     *
     */
    pattern?: string;
    [k: string]: unknown;
  };
}
/**
 * path_regexp: object
 * Module: http.matchers.path_regexp
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchPathRE
 * MatchPathRE matches requests by a regular expression on the URI's path.
 * Path matching is performed in the unescaped (decoded) form of the path.
 *
 * Upon a match, it adds placeholders to the request: `{http.regexp.name.capture_group}`
 * where `name` is the regular expression's name, and `capture_group` is either
 * the named or positional capture group from the expression itself. If no name
 * is given, then the placeholder omits the name: `{http.regexp.capture_group}`
 * (potentially leading to collisions).
 *
 *
 */
export interface HttpMatchersPathRegexp {
  /**
   * name: string
   * Module: http.matchers.path_regexp
   * A unique name for this regular expression. Optional,
   * but useful to prevent overwriting captures from other
   * regexp matchers.
   *
   */
  name?: string;
  /**
   * pattern: string
   * Module: http.matchers.path_regexp
   * The regular expression to evaluate, in RE2 syntax,
   * which is the same general syntax used by Go, Perl,
   * and Python. For details, see
   * [Go's regexp package](https://golang.org/pkg/regexp/).
   * Captures are accessible via placeholders. Unnamed
   * capture groups are exposed as their numeric, 1-based
   * index, while named capture groups are available by
   * the capture group name.
   *
   */
  pattern?: string;
  [k: string]: unknown;
}
/**
 * query: object
 * Module: http.matchers.query
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchQuery
 * MatchQuery matches requests by the URI's query string. It takes a JSON object
 * keyed by the query keys, with an array of string values to match for that key.
 * Query key matches are exact, but wildcards may be used for value matches. Both
 * keys and values may be placeholders.
 *
 * An example of the structure to match `?key=value&topic=api&query=something` is:
 *
 * ```json
 * {
 * 	"key": ["value"],
 * 	"topic": ["api"],
 * 	"query": ["*"]
 * }
 * ```
 *
 * Invalid query strings, including those with bad escapings or illegal characters
 * like semicolons, will fail to parse and thus fail to match.
 *
 * **NOTE:** Notice that query string values are arrays, not singular values. This is
 * because repeated keys are valid in query strings, and each one may have a
 * different value. This matcher will match for a key if any one of its configured
 * values is assigned in the query string. Backend applications relying on query
 * strings MUST take into consideration that query string values are arrays and can
 * have multiple values.
 *
 *
 */
export interface HttpMatchersQuery {
  [k: string]: string[];
}
/**
 * remote_ip: object
 * Module: http.matchers.remote_ip
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchRemoteIP
 * MatchRemoteIP matches requests by the remote IP address,
 * i.e. the IP address of the direct connection to Caddy.
 *
 *
 */
export interface HttpMatchersRemoteIp {
  /**
   * forwarded: boolean
   * Module: http.matchers.remote_ip
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchRemoteIP
   */
  forwarded?: boolean;
  /**
   * ranges: array
   * Module: http.matchers.remote_ip
   * The IPs or CIDR ranges to match.
   *
   */
  ranges?: string[];
  [k: string]: unknown;
}
/**
 * vars: object
 * Module: http.matchers.vars
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#VarsMatcher
 * VarsMatcher is an HTTP request matcher which can match
 * requests based on variables in the context or placeholder
 * values. The key is the placeholder or name of the variable,
 * and the values are possible values the variable can be in
 * order to match (logical OR'ed).
 *
 * If the key is surrounded by `{ }` it is assumed to be a
 * placeholder. Otherwise, it will be considered a variable
 * name.
 *
 * Placeholders in the keys are not expanded, but
 * placeholders in the values are.
 *
 *
 */
export interface HttpMatchersVars {
  [k: string]: unknown;
}
/**
 * vars_regexp: object
 * Module: http.matchers.vars_regexp
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchRegexp
 * MatchRegexp is an embedable type for matching
 * using regular expressions. It adds placeholders
 * to the request's replacer.
 *
 *
 */
export interface HttpMatchersVarsRegexp {
  /**
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddyhttp#MatchRegexp
   * MatchRegexp is an embedable type for matching
   * using regular expressions. It adds placeholders
   * to the request's replacer.
   *
   *
   */
  [k: string]: {
    /**
     * name: string
     * Module: http.matchers.vars_regexp
     * A unique name for this regular expression. Optional,
     * but useful to prevent overwriting captures from other
     * regexp matchers.
     *
     */
    name?: string;
    /**
     * pattern: string
     * Module: http.matchers.vars_regexp
     * The regular expression to evaluate, in RE2 syntax,
     * which is the same general syntax used by Go, Perl,
     * and Python. For details, see
     * [Go's regexp package](https://golang.org/pkg/regexp/).
     * Captures are accessible via placeholders. Unnamed
     * capture groups are exposed as their numeric, 1-based
     * index, while named capture groups are available by
     * the capture group name.
     *
     */
    pattern?: string;
    [k: string]: unknown;
  };
}
/**
 * remote_ip: object
 * Module: tls.handshake_match.remote_ip
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#MatchRemoteIP
 * MatchRemoteIP matches based on the remote IP of the
 * connection. Specific IPs or CIDR ranges can be specified.
 *
 * Note that IPs can sometimes be spoofed, so do not rely
 * on this as a replacement for actual authentication.
 *
 *
 */
export interface TlsHandshakeMatchRemoteIp {
  /**
   * not_ranges: array
   * Module: tls.handshake_match.remote_ip
   * The IPs or CIDR ranges to *NOT* match.
   *
   */
  not_ranges?: string[];
  /**
   * ranges: array
   * Module: tls.handshake_match.remote_ip
   * The IPs or CIDR ranges to match.
   *
   */
  ranges?: string[];
  [k: string]: unknown;
}
/**
 * pki: object
 * Module: pki
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddypki#PKI
 * PKI provides Public Key Infrastructure facilities for Caddy.
 *
 * This app can define certificate authorities (CAs) which are capable
 * of signing certificates. Other modules can be configured to use
 * the CAs defined by this app for issuing certificates or getting
 * key information needed for establishing trust.
 *
 *
 */
export interface Pki {
  /**
   * certificate_authorities: object
   * Module: pki
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddypki#CA
   * The certificate authorities to manage. Each CA is keyed by an
   * ID that is used to uniquely identify it from other CAs.
   * At runtime, the GetCA() method should be used instead to ensure
   * the default CA is provisioned if it hadn't already been.
   * The default CA ID is "local".
   *
   *
   * CA describes a certificate authority, which consists of
   * root/signing certificates and various settings pertaining
   * to the issuance of certificates and trusting them.
   *
   */
  certificate_authorities?: {
    /**
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddypki#CA
     * The certificate authorities to manage. Each CA is keyed by an
     * ID that is used to uniquely identify it from other CAs.
     * At runtime, the GetCA() method should be used instead to ensure
     * the default CA is provisioned if it hadn't already been.
     * The default CA ID is "local".
     *
     *
     * CA describes a certificate authority, which consists of
     * root/signing certificates and various settings pertaining
     * to the issuance of certificates and trusting them.
     *
     */
    [k: string]: {
      /**
       * install_trust: boolean
       * Module: pki
       * Whether Caddy will attempt to install the CA's root
       * into the system trust store, as well as into Java
       * and Mozilla Firefox trust stores. Default: true.
       *
       */
      install_trust?: boolean;
      /**
       * intermediate: object
       * Module: pki
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddypki#KeyPair
       * The intermediate (signing) certificate; if null, one will be generated.
       *
       *
       * KeyPair represents a public-private key pair, where the
       * public key is also called a certificate.
       *
       */
      intermediate?: {
        /**
         * certificate: string
         * Module: pki
         * The certificate. By default, this should be the path to
         * a PEM file unless format is something else.
         *
         */
        certificate?: string;
        /**
         * format: string
         * Module: pki
         * The format in which the certificate and private
         * key are provided. Default: pem_file
         *
         */
        format?: string;
        /**
         * private_key: string
         * Module: pki
         * The private key. By default, this should be the path to
         * a PEM file unless format is something else.
         *
         */
        private_key?: string;
        [k: string]: unknown;
      };
      /**
       * intermediate_common_name: string
       * Module: pki
       * The name to put in the CommonName field of the
       * intermediate certificates.
       *
       */
      intermediate_common_name?: string;
      /**
       * name: string
       * Module: pki
       * The user-facing name of the certificate authority.
       *
       */
      name?: string;
      /**
       * root: object
       * Module: pki
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddypki#KeyPair
       * The root certificate to use; if null, one will be generated.
       *
       *
       * KeyPair represents a public-private key pair, where the
       * public key is also called a certificate.
       *
       */
      root?: {
        /**
         * certificate: string
         * Module: pki
         * The certificate. By default, this should be the path to
         * a PEM file unless format is something else.
         *
         */
        certificate?: string;
        /**
         * format: string
         * Module: pki
         * The format in which the certificate and private
         * key are provided. Default: pem_file
         *
         */
        format?: string;
        /**
         * private_key: string
         * Module: pki
         * The private key. By default, this should be the path to
         * a PEM file unless format is something else.
         *
         */
        private_key?: string;
        [k: string]: unknown;
      };
      /**
       * root_common_name: string
       * Module: pki
       * The name to put in the CommonName field of the
       * root certificate.
       *
       */
      root_common_name?: string;
      /**
       * storage: object
       * Module: caddy.storage
       * Optionally configure a separate storage module associated with this
       * issuer, instead of using Caddy's global/default-configured storage.
       * This can be useful if you want to keep your signing keys in a
       * separate location from your leaf certificates.
       *
       */
      storage?: {
        [k: string]: unknown;
      } & {
        /**
         * key to identify storage module.
         * module: string
         * Module: caddy.storage
         */
        module?: "file_system";
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
  };
  [k: string]: unknown;
}
/**
 * tls: object
 * Module: tls
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#TLS
 * TLS provides TLS facilities including certificate
 * loading and management, client auth, and more.
 *
 *
 */
export interface Tls {
  /**
   * automation: object
   * Module: tls
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#AutomationConfig
   * Configures certificate automation.
   *
   *
   * AutomationConfig governs the automated management of TLS certificates.
   *
   */
  automation?: {
    /**
     * ocsp_interval: number
     * Module: tls
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
     * Caddy staples OCSP (and caches the response) for all
     * qualifying certificates by default. This setting
     * changes how often it scans responses for freshness,
     * and updates them if they are getting stale. Default: 1h
     *
     *
     * Duration can be an integer or a string. An integer is
     * interpreted as nanoseconds. If a string, it is a Go
     * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
     * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
     *
     */
    ocsp_interval?: number;
    /**
     * on_demand: object
     * Module: tls
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#OnDemandConfig
     * On-Demand TLS defers certificate operations to the
     * moment they are needed, e.g. during a TLS handshake.
     * Useful when you don't know all the hostnames at
     * config-time, or when you are not in control of the
     * domain names you are managing certificates for.
     * In 2015, Caddy became the first web server to
     * implement this experimental technology.
     *
     * Note that this field does not enable on-demand TLS;
     * it only configures it for when it is used. To enable
     * it, create an automation policy with `on_demand`.
     *
     *
     * OnDemandConfig configures on-demand TLS, for obtaining
     * needed certificates at handshake-time. Because this
     * feature can easily be abused, you should use this to
     * establish rate limits and/or an internal endpoint that
     * Caddy can "ask" if it should be allowed to manage
     * certificates for a given hostname.
     *
     */
    on_demand?: {
      /**
       * ask: string
       * Module: tls
       * DEPRECATED. WILL BE REMOVED SOON. Use 'permission' instead.
       *
       */
      ask?: string;
      /**
       * rate_limit: object
       * Module: tls
       * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#RateLimit
       * DEPRECATED. An optional rate limit to throttle
       * the checking of storage and the issuance of
       * certificates from handshakes if not already in
       * storage. WILL BE REMOVED IN A FUTURE RELEASE.
       *
       *
       * DEPRECATED. WILL LIKELY BE REMOVED SOON.
       * Instead of using this rate limiter, use a proper tool such as a
       * level 3 or 4 firewall and/or a permission module to apply rate limits.
       *
       */
      rate_limit?: {
        /**
         * burst: number
         * Module: tls
         * How many times during an interval storage can be checked or a
         * certificate can be obtained.
         *
         */
        burst?: number;
        /**
         * interval: number
         * Module: tls
         * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
         * A duration value. Storage may be checked and a certificate may be
         * obtained 'burst' times during this interval.
         *
         *
         * Duration can be an integer or a string. An integer is
         * interpreted as nanoseconds. If a string, it is a Go
         * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
         * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
         *
         */
        interval?: number;
        [k: string]: unknown;
      };
      [k: string]: unknown;
    };
    /**
     * policies: array
     * Module: tls
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#AutomationPolicy
     * The list of automation policies. The first policy matching
     * a certificate or subject name will be applied.
     *
     *
     * AutomationPolicy designates the policy for automating the
     * management (obtaining, renewal, and revocation) of managed
     * TLS certificates.
     *
     * An AutomationPolicy value is not valid until it has been
     * provisioned; use the `AddAutomationPolicy()` method on the
     * TLS app to properly provision a new policy.
     *
     */
    policies?: {
      /**
       * disable_ocsp_stapling: boolean
       * Module: tls
       * Disables OCSP stapling. Disabling OCSP stapling puts clients at
       * greater risk, reduces their privacy, and usually lowers client
       * performance. It is NOT recommended to disable this unless you
       * are able to justify the costs.
       * EXPERIMENTAL. Subject to change.
       *
       */
      disable_ocsp_stapling?: boolean;
      /**
       * issuer: object
       * Module: tls.issuance
       */
      issuer?: {
        [k: string]: unknown;
      } & {
        [k: string]: unknown;
      } & {
        [k: string]: unknown;
      } & {
        /**
         * key to identify issuer module.
         * module: string
         * Module: tls.issuance
         */
        module?: "zerossl" | "acme" | "internal";
        [k: string]: unknown;
      };
      /**
       * issuers: array
       * Module: tls.issuance
       * The modules that may issue certificates. Default: internal if all
       * subjects do not qualify for public certificates; otherwise acme and
       * zerossl.
       *
       */
      issuers?: ({
        [k: string]: unknown;
      } & {
        [k: string]: unknown;
      } & {
        [k: string]: unknown;
      } & {
        /**
         * key to identify issuers module.
         * module: string
         * Module: tls.issuance
         */
        module?: "acme" | "internal" | "zerossl";
        [k: string]: unknown;
      })[];
      /**
       * key_type: string
       * Module: tls
       * The type of key to generate for certificates.
       * Supported values: `ed25519`, `p256`, `p384`, `rsa2048`, `rsa4096`.
       *
       */
      key_type?: string;
      /**
       * must_staple: boolean
       * Module: tls
       * If true, certificates will be requested with MustStaple. Not all
       * CAs support this, and there are potentially serious consequences
       * of enabling this feature without proper threat modeling.
       *
       */
      must_staple?: boolean;
      /**
       * ocsp_overrides: object
       * Module: tls
       * Overrides the URLs of OCSP responders embedded in certificates.
       * Each key is a OCSP server URL to override, and its value is the
       * replacement. An empty value will disable querying of that server.
       * EXPERIMENTAL. Subject to change.
       *
       */
      ocsp_overrides?: {
        /**
         * Overrides the URLs of OCSP responders embedded in certificates.
         * Each key is a OCSP server URL to override, and its value is the
         * replacement. An empty value will disable querying of that server.
         * EXPERIMENTAL. Subject to change.
         *
         */
        [k: string]: {
          [k: string]: unknown;
        };
      };
      /**
       * on_demand: boolean
       * Module: tls
       * If true, certificates will be managed "on demand"; that is, during
       * TLS handshakes or when needed, as opposed to at startup or config
       * load. This enables On-Demand TLS for this policy.
       *
       */
      on_demand?: boolean;
      /**
       * renewal_window_ratio: object
       * Module: tls
       * How long before a certificate's expiration to try renewing it,
       * as a function of its total lifetime. As a general and conservative
       * rule, it is a good idea to renew a certificate when it has about
       * 1/3 of its total lifetime remaining. This utilizes the majority
       * of the certificate's lifetime while still saving time to
       * troubleshoot problems. However, for extremely short-lived certs,
       * you may wish to increase the ratio to ~1/2.
       *
       */
      renewal_window_ratio?: {
        [k: string]: unknown;
      };
      /**
       * storage: object
       * Module: caddy.storage
       * Optionally configure a separate storage module associated with this
       * manager, instead of using Caddy's global/default-configured storage.
       *
       */
      storage?: {
        [k: string]: unknown;
      } & {
        /**
         * key to identify storage module.
         * module: string
         * Module: caddy.storage
         */
        module?: "file_system";
        [k: string]: unknown;
      };
      /**
       * subjects: array
       * Module: tls
       * Which subjects (hostnames or IP addresses) this policy applies to.
       *
       * This list is a filter, not a command. In other words, it is used
       * only to filter whether this policy should apply to a subject that
       * needs a certificate; it does NOT command the TLS app to manage a
       * certificate for that subject. To have Caddy automate a certificate
       * or specific subjects, use the "automate" certificate loader module
       * of the TLS app.
       *
       */
      subjects?: string[];
      [k: string]: unknown;
    }[];
    /**
     * renew_interval: number
     * Module: tls
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
     * Every so often, Caddy will scan all loaded, managed
     * certificates for expiration. This setting changes how
     * frequently the scan for expiring certificates is
     * performed. Default: 10m
     *
     *
     * Duration can be an integer or a string. An integer is
     * interpreted as nanoseconds. If a string, it is a Go
     * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
     * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
     *
     */
    renew_interval?: number;
    /**
     * storage_clean_interval: number
     * Module: tls
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
     * How often to scan storage units for old or expired
     * assets and remove them. These scans exert lots of
     * reads (and list operations) on the storage module, so
     * choose a longer interval for large deployments.
     * Default: 24h
     *
     * Storage will always be cleaned when the process first
     * starts. Then, a new cleaning will be started this
     * duration after the previous cleaning started if the
     * previous cleaning finished in less than half the time
     * of this interval (otherwise next start will be skipped).
     *
     *
     * Duration can be an integer or a string. An integer is
     * interpreted as nanoseconds. If a string, it is a Go
     * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
     * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
     *
     */
    storage_clean_interval?: number;
    [k: string]: unknown;
  };
  /**
   * cache: object
   * Module: tls
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#CertCacheOptions
   * Configures the in-memory certificate cache.
   *
   *
   * CertCacheOptions configures the certificate cache.
   *
   */
  cache?: {
    /**
     * capacity: number
     * Module: tls
     * Maximum number of certificates to allow in the
     * cache. If reached, certificates will be randomly
     * evicted to make room for new ones. Default: 10,000
     *
     */
    capacity?: number;
    [k: string]: unknown;
  };
  /**
   * certificates: object
   * Module: tls.certificates
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2#ModuleMap
   * Certificates to load into memory for quick recall during
   * TLS handshakes. Each key is the name of a certificate
   * loader module.
   *
   * The "automate" certificate loader module can be used to
   * specify a list of subjects that need certificates to be
   * managed automatically. The first matching automation
   * policy will be applied to manage the certificate(s).
   *
   * All loaded certificates get pooled
   * into the same cache and may be used to complete TLS
   * handshakes for the relevant server names (SNI).
   * Certificates loaded manually (anything other than
   * "automate") are not automatically managed and will
   * have to be refreshed manually before they expire.
   *
   *
   * ModuleMap is a map that can contain multiple modules,
   * where the map key is the module's name. (The namespace
   * is usually read from an associated field's struct tag.)
   * Because the module's name is given as the key in a
   * module map, the name does not have to be given in the
   * json.RawMessage.
   *
   */
  certificates?: {
    automate?: TlsCertificatesAutomate;
    load_files?: TlsCertificatesLoadFiles;
    load_folders?: TlsCertificatesLoadFolders;
    load_pem?: TlsCertificatesLoadPem;
    load_storage?: TlsCertificatesLoadStorage;
    [k: string]: unknown;
  };
  /**
   * disable_ocsp_stapling: boolean
   * Module: tls
   * Disables OCSP stapling for manually-managed certificates only.
   * To configure OCSP stapling for automated certificates, use an
   * automation policy instead.
   *
   * Disabling OCSP stapling puts clients at greater risk, reduces their
   * privacy, and usually lowers client performance. It is NOT recommended
   * to disable this unless you are able to justify the costs.
   * EXPERIMENTAL. Subject to change.
   *
   */
  disable_ocsp_stapling?: boolean;
  /**
   * session_tickets: object
   * Module: tls
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#SessionTicketService
   * Configures session ticket ephemeral keys (STEKs).
   *
   *
   * SessionTicketService configures and manages TLS session tickets.
   *
   */
  session_tickets?: {
    /**
     * disable_rotation: boolean
     * Module: tls
     * Disables STEK rotation.
     *
     */
    disable_rotation?: boolean;
    /**
     * disabled: boolean
     * Module: tls
     * Disables TLS session resumption by tickets.
     *
     */
    disabled?: boolean;
    /**
     * key_source: object
     * Module: tls.stek
     * KeySource is the method by which Caddy produces or obtains
     * TLS session ticket keys (STEKs). By default, Caddy generates
     * them internally using a secure pseudorandom source.
     *
     */
    key_source?: {
      [k: string]: unknown;
    } & {
      /**
       * key to identify key_source module.
       * provider: string
       * Module: tls.stek
       */
      provider?: "distributed" | "standard";
      [k: string]: unknown;
    };
    /**
     * max_keys: number
     * Module: tls
     * The maximum number of keys to keep in rotation. Default: 4.
     *
     */
    max_keys?: number;
    /**
     * rotation_interval: number
     * Module: tls
     * https://pkg.go.dev/github.com/caddyserver/caddy/v2#Duration
     * How often Caddy rotates STEKs. Default: 12h.
     *
     *
     * Duration can be an integer or a string. An integer is
     * interpreted as nanoseconds. If a string, it is a Go
     * time.Duration value such as `300ms`, `1.5h`, or `2h45m`;
     * valid units are `ns`, `us`/`µs`, `ms`, `s`, `m`, `h`, and `d`.
     *
     */
    rotation_interval?: number;
    [k: string]: unknown;
  };
  [k: string]: unknown;
}
/**
 * load_storage: object
 * Module: tls.certificates.load_storage
 * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#StorageLoader
 * StorageLoader loads certificates and their associated keys
 * from the globally configured storage module.
 *
 *
 */
export interface TlsCertificatesLoadStorage {
  /**
   * pairs: array
   * Module: tls.certificates.load_storage
   * https://pkg.go.dev/github.com/caddyserver/caddy/v2/modules/caddytls#CertKeyFilePair
   * A list of pairs of certificate and key file names along with their
   * encoding format so that they can be loaded from storage.
   *
   *
   * CertKeyFilePair pairs certificate and key file names along with their
   * encoding format so that they can be loaded from disk.
   *
   */
  pairs?: {
    /**
     * certificate: string
     * Module: tls.certificates.load_storage
     * Path to the certificate (public key) file.
     *
     */
    certificate?: string;
    /**
     * format: string
     * Module: tls.certificates.load_storage
     * The format of the cert and key. Can be "pem". Default: "pem"
     *
     */
    format?: string;
    /**
     * key: string
     * Module: tls.certificates.load_storage
     * Path to the private key file.
     *
     */
    key?: string;
    /**
     * tags: array
     * Module: tls.certificates.load_storage
     * Arbitrary values to associate with this certificate.
     * Can be useful when you want to select a particular
     * certificate when there may be multiple valid candidates.
     *
     */
    tags?: string[];
    [k: string]: unknown;
  }[];
  [k: string]: unknown;
}
