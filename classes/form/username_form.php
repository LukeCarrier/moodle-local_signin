<?php

/**
 * Username form
 *
 * @author Earle Skinner <earle.skinner@avadolearning.com>
 * @copyright 2017 AVADO Learning
 */

namespace local_signin\form;

use bmdisco_domain\brand_domain;
use local_signin\util;
use moodleform;

defined('MOODLE_INTERNAL') || die;

require_once "{$CFG->libdir}/formslib.php";

class username_form extends moodleform {
    /**
     * @override \moodleform
     */
    public function definition() {
        global $frm;

        $mform  = $this->_form;

        $username = '';
        if (isset($frm) && isset($frm->username) && $frm->username) {
            $username = $frm->username;
        }
        $user_attributes = array('placeholder'   => $this->lang_string('form_username_placeholder'),
                                 'additionalcss' => $this->lang_string('form_username_button_class'),
                                 'autofocus'     => '',
                                 'value'         => $username);
        $mform->addElement('text', 'username', $this->lang_string('form_username_label'), $user_attributes);
        $mform->setType('username', PARAM_RAW);

        $returnurl = optional_param('returnurl', '', PARAM_URL);
        $mform->addElement('hidden', 'returnurl', $returnurl);
        $mform->setType('returnurl', PARAM_URL);

        $mform->addElement('html', sprintf('<div class="%s">', $this->lang_string('form_username_remusername_class')));
        $mform->addElement('advcheckbox', 'rememberme', '', $this->lang_string('form_username_remusername_label'));
        $mform->addElement('html', '</div>');

        $submit_attributes = array('additionalcss' => $this->lang_string('form_username_button_class'));
        $mform->addElement('submit', 'submitusername', $this->lang_string('form_username_button_label'), $submit_attributes);

        $mform->addElement('html', sprintf('<div class="%s"><a href="%s">%s</a></div>',
            $this->lang_string('form_userpass_forgot_class'),
            new \moodle_url('/local/signin/forgot.php'),
            $this->lang_string('form_username_forgot_label')));
    }

    public function lang_string($id) {
        return get_string($id, util::MOODLE_COMPONENT);
    }

    /**
     * Validate the username field.
     *
     * @param array $data
     * @param array $files
     * @return array|null
     */
    public function validation($data, $files) {
        global $CFG, $PAGE;

        if (!array_key_exists('username', $data)) {
            return array('username' => $this->lang_string('form_username_not_provided'));
        }

        $username = $data['username'];

        if (strlen($username) == 0 || !static::active_user_exists($username)) {
            return array('username' => $this->lang_string('form_username_not_found_valid'));
        }

        if ($username == 'guest') {
            return;
        }

        if (class_exists('bmdisco_domain\brand_domain')) {
            $correct_domain = brand_domain::get_default_domain($username)->domain;
            if ($correct_domain) {
                $current_domain = parse_url($CFG->wwwroot, PHP_URL_HOST);
                if ($current_domain !== $correct_domain) {
                    $url = new \moodle_url(str_replace($current_domain, $correct_domain, $PAGE->url), array('username' => $username));
                    redirect($url);
                }
            }
        }

        return;
    }

    /**
     * Confirms whether a username exists in the database.
     *
     * @param $username
     * @return boolean
     */
    public static function active_user_exists($username) {
        global $DB;
        return $DB->record_exists('user', array('username' => $username, 'deleted' => 0, 'suspended' => 0));
    }
}