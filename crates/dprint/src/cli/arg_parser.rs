use std::path::PathBuf;
use crate::environment::Environment;
use crate::types::ErrBox;

pub struct CliArgs {
    pub sub_command: SubCommand,
    pub allow_node_modules: bool,
    pub verbose: bool,
    pub file_patterns: Vec<String>,
    pub exclude_file_patterns: Vec<String>,
    pub plugin_urls: Vec<String>,
    pub help_text: Option<String>,
    config: Option<String>,
    config_file_path: Option<PathBuf>,
    /// The directory to do globbing from.
    base_directory_path: Option<PathBuf>,
}

const DEFAULT_CONFIG_FILE_NAME: &'static str = "dprint.config.json";

impl CliArgs {
    pub fn initialize_with_environment(&mut self, environment: &impl Environment) {
        let (file_path, base_directory) = if let Some(config) = self.config.take() {
            (PathBuf::from(config), PathBuf::from("./")) // use cwd as base path
        } else {
            get_default_paths(environment)
        };
        self.config_file_path.replace(file_path);
        self.base_directory_path.replace(base_directory);

        fn get_default_paths(environment: &impl Environment) -> (PathBuf, PathBuf) {
            let config_file_path = PathBuf::from(format!("./{}", DEFAULT_CONFIG_FILE_NAME));

            if !environment.path_exists(&config_file_path) {
                if let Some(path_info) = get_default_config_file_in_ancestor_directories(environment) {
                    return path_info;
                }
            }

            // just return this if it doesn't find a config file in the ancestor paths
            (config_file_path, PathBuf::from("./"))
        }

        fn get_default_config_file_in_ancestor_directories(environment: &impl Environment) -> Option<(PathBuf, PathBuf)> {
            match environment.cwd() {
                Ok(cwd) => {
                    for ancestor_dir in cwd.ancestors() {
                        let ancestor_config_path = ancestor_dir.join(DEFAULT_CONFIG_FILE_NAME);
                        if environment.path_exists(&ancestor_config_path) {
                            return Some((ancestor_config_path, ancestor_dir.to_owned()));
                        }
                    }
                },
                Err(err) => {
                    environment.log_verbose(&format!("Error getting current working directory: {:?}", err));
                }
            }

            None
        }
    }

    pub fn get_config_file_path(&self) -> &PathBuf {
        self.config_file_path.as_ref().expect("Should have initialized args with environment first.")
    }

    pub fn get_base_directory_path(&self) -> &PathBuf {
        self.base_directory_path.as_ref().expect("Should have initialized args with environment first.")
    }
}

#[derive(Debug, PartialEq)]
pub enum SubCommand {
    Check,
    Fmt,
    Init,
    ClearCache,
    OutputFilePaths,
    OutputResolvedConfig,
    Version,
    Help
}

pub fn parse_args(args: Vec<String>) -> Result<CliArgs, ErrBox> {
    let mut cli_parser = create_cli_parser();
    let matches = match cli_parser.get_matches_from_safe_borrow(args) {
        Ok(result) => result,
        Err(err) => return err!("{}", err.to_string()),
    };

    let sub_command = if matches.is_present("fmt") {
        SubCommand::Fmt
    } else if matches.is_present("check") {
        SubCommand::Check
    } else if matches.is_present("init") {
        SubCommand::Init
    } else if matches.is_present("clear-cache") {
        SubCommand::ClearCache
    } else if matches.is_present("output-file-paths") {
        SubCommand::OutputFilePaths
    } else if matches.is_present("output-resolved-config") {
        SubCommand::OutputResolvedConfig
    } else if matches.is_present("version") {
        SubCommand::Version
    } else {
        SubCommand::Help
    };

    let help_text = if sub_command == SubCommand::Help {
        let mut text = Vec::new();
        cli_parser.write_help(&mut text).unwrap();
        Some(String::from_utf8(text).unwrap())
    } else { None };

    Ok(CliArgs {
        sub_command,
        verbose: matches.is_present("verbose"),
        allow_node_modules: matches.is_present("allow-node-modules"),
        config: matches.value_of("config").map(String::from),
        file_patterns: values_to_vec(matches.values_of("files")),
        exclude_file_patterns: values_to_vec(matches.values_of("excludes")),
        plugin_urls: values_to_vec(matches.values_of("plugins")),
        help_text,
        config_file_path: None,
        base_directory_path: None,
    })
}

fn create_cli_parser<'a, 'b>() -> clap::App<'a, 'b> {
    use clap::{App, Arg, SubCommand, AppSettings};
    App::new("dprint")
        .setting(AppSettings::UnifiedHelpMessage)
        .setting(AppSettings::DisableHelpFlags)
        .setting(AppSettings::DisableHelpSubcommand)
        .setting(AppSettings::DeriveDisplayOrder)
        .bin_name("dprint")
        .version(env!("CARGO_PKG_VERSION"))
        .author("Copyright 2020 by David Sherret")
        .about("Auto-formats source code based on the specified plugins.")
        .usage("dprint <SUBCOMMAND> [OPTIONS] [--] [files]...")
        .template(r#"{bin} {version}
{author}

{about}

USAGE:
    {usage}

SUBCOMMANDS:
{subcommands}

OPTIONS:
{unified}

ARGS:
{positionals}

{after-help}"#)
        .after_help(
            r#"GETTING STARTED:
    1. Navigate to the root directory of a code repository
    2. Run `dprint init` to create a dprint.config.json file in that directory
    3. Modify configuration file if necessary
    4. Run `dprint fmt` or `dprint check`

EXAMPLES:
    Write formatted files to file system:

      dprint fmt

    Check for files that haven't been formatted:

      dprint check

    Specify path to config file other than the default:

      dprint fmt --config configs/dprint.config.json

    Search for files using the specified file patterns:

      dprint fmt "**/*.{ts,tsx,js,jsx,json}""#,
        )
        .subcommand(
            SubCommand::with_name("init")
                .about("Initializes a configuration file in the current directory.")
        )
        .subcommand(
            SubCommand::with_name("fmt")
                .about("Formats the source files and writes the result to the file system.")
        )
        .subcommand(
            SubCommand::with_name("check")
                .about("Checks for any files that haven't been formatted.")
        )
        .subcommand(
            SubCommand::with_name("output-file-paths")
                .about("Prints the resolved file paths for the plugins based on the args and configuration.")
        )
        .subcommand(
            SubCommand::with_name("output-resolved-config")
                .about("Prints the resolved configuration for the plugins based on the args and configuration.")
        )
        .subcommand(
            SubCommand::with_name("clear-cache")
                .about("Deletes the plugin cache directory.")
        )
        .arg(
            Arg::with_name("files")
                .help("List of files or globs in quotes to format. This overrides what is specified in the config file.")
                .takes_value(true)
                .global(true)
                .multiple(true),
        )
        .arg(
            Arg::with_name("config")
                .long("config")
                .short("c")
                .help("Path to JSON configuration file. Defaults to ./dprint.config.json when not provided.")
                .global(true)
                .takes_value(true),
        )
        .arg(
            Arg::with_name("help")
                .long("help")
                .short("h")
                .hidden(true)
                .takes_value(false),
        )
        .arg(
            Arg::with_name("excludes")
                .long("excludes")
                .global(true)
                .value_name("patterns")
                .help("List of files or directories or globs in quotes to exclude when formatting. This overrides what is specified in the config file.")
                .takes_value(true)
                .multiple(true),
        )
        .arg(
            Arg::with_name("allow-node-modules")
                .long("allow-node-modules")
                .help("Allows traversing node module directories (unstable - This flag will be renamed to be non-node specific in the future).")
                .global(true)
                .takes_value(false),
        )
        .arg(
            Arg::with_name("plugins")
                .long("plugins")
                .value_name("urls")
                .help("List of urls of plugins to use. This overrides what is specified in the config file.")
                .global(true)
                .takes_value(true)
                .multiple(true),
        )
        .arg(
            Arg::with_name("verbose")
                .long("verbose")
                .help("Prints additional diagnostic information.")
                .global(true)
                .takes_value(false),
        )
        .arg(
            Arg::with_name("version")
                .short("v")
                .long("version")
                .help("Prints the version.")
                .takes_value(false),
        )
}

fn values_to_vec(values: Option<clap::Values>) -> Vec<String> {
    values.map(|x| x.map(std::string::ToString::to_string).collect()).unwrap_or(Vec::new())
}
