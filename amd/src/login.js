/**
 * Javascript to handle signin logic.
 *
 * @module     local_signin/login
 * @package    local_signin
 *
 */
define(['jquery', 'core/ajax', 'core/str'], function($, ajax, str) {
    const WEB_SERVICE_METHOD_NAME = 'local_signin_check_domain';
    var defaults = {
        form : {
            window     : '#local-signin',
            errors     : '.errors',
            alert      : '.nouser'
        },
        username : {
            container  : '.username_form',
            input      : '#id_username',
            submit     : '#id_submitusername',
            rememberme : '#check_rememberme',
            validation : handleUsernameSubmission
        },
        password : {
            container  : '.password_form',
            input      : '#id_password',
            submit     : '#id_submitpassword',
            rememberme : '#check_rememberme',
            changeuser : '.changeuser'
        }
    };
    var options;

    return {
        init: function(overrides) {
            options = $.extend(defaults, overrides);

            // Locate dom elements
            var $usernameContainer = $(options.username.container);
            var $passwordContainer = $(options.password.container);
            options.dom = {
                username : {
                    container  : $usernameContainer,
                    form       : $usernameContainer.find('form'),
                    input      : $usernameContainer.find(options.username.input),
                    rememberme : $usernameContainer.find(options.username.rememberme),
                    submit     : $usernameContainer.find(options.username.submit)
                },
                password : {
                    container  : $passwordContainer,
                    form       : $passwordContainer.find('form'),
                    username   : $passwordContainer.find(options.username.input),
                    input      : $passwordContainer.find(options.password.input),
                    rememberme : $passwordContainer.find(options.password.rememberme),
                    submit     : $passwordContainer.find(options.password.submit),
                    changeuser : $passwordContainer.find(options.password.changeuser)
                }
            };

            // Ensure forms are in the correct state:
            //   -> Submit buttons are disabled/enabled on both user & password
            //      forms if input box is empty/filled.
            //   -> The password form should be hidden if a username is already
            //      known.
            if (options.dom.username.input.val().length === 0) {
                options.dom.password.container.addClass('hide');
                options.dom.username.submit.attr('disabled', 'disabled');
            }
            if (options.dom.password.input.val().length === 0) {
                options.dom.password.submit.attr('disabled', 'disabled');
            }

            // Change state of the submit buttons after input
            options.dom.username.input.on('input', options.dom.username, handleFormInputChange);
            options.dom.password.input.on('input', options.dom.password, handleFormInputChange);

            // Handle change user link
            options.dom.password.changeuser.on('click', options.dom, toggleForms);

            // Handle form submissions
            options.dom.username.form.on('submit', options.dom, options.username.validation);
        }
    };

    function handleFormInputChange(event) {
        var options = event.data;
        options.input.val() === '' ?
            options.submit.attr('disabled', 'disabled') :
            options.submit.removeAttr('disabled');
    }

    function handleUsernameSubmission(event) {
        event.preventDefault();
        var options = event.data;
        var username = options.username.input.val();

        if (username.toLowerCase() === 'guest') {
            // Populate the username field in the password form
            options.password.username.val(username);
            options.password.form.submit();
            return;
        }

        setRememberMe(options);
        checkDomain(username, options);
    }

    /**
     * Carries the rememberme value over from the username to the password form.
     *
     * @param options
     */
    function setRememberMe(options) {
        var userRememberMe = options.username.rememberme;
        var passRememberMe = options.password.rememberme;
        passRememberMe.val(Number(userRememberMe.prop('checked')));
    }

    /**
     * Checks if the user is on the correct domain and takes appropriate action:
     * redirect, notify an invalid username, or nothing if the domain webservice is not available.
     *
     * @param username
     * @param options
     */
    function checkDomain(username, options) {
        queryWebservice(username)[0].done(function(response) {
            maybeDomainRedirect(response, username, options);
        }).fail(function(response) {
            if (response.errorcode === 'invalidparameter') {
                getStringAndNotify('danger', 'invalid_user');
            } else if (response.errorcode === 'multiplerecordsfound') {
                getStringAndNotify('danger', 'duplicate_field');
            } else {
                noWebService(options);
            }
        });
    }

    /**
     * Queries the domain webservice.
     *
     * @param username
     * @returns {*}
     */
    function queryWebservice(input){
        return ajax.call([
            {
                methodname: WEB_SERVICE_METHOD_NAME,
                args: {
                    input: input
                }
            }
        ]);
    }

    /**
     * Redirects to another domain if necessary.
     *
     * @param response
     * @param username
     * @param options
     */
    function maybeDomainRedirect(response, username, options) {
        var currentURL = window.location;
        if (response.email === null) {
            getStringAndNotify('danger', 'form_username_not_found_valid');
        } else if (response.domain !== currentURL.hostname) {
            redirect(response, username);
        } else {
            $(defaults.form.alert).alert('close');
            // Stay on page & flip over to password form
            // Populate username field on password form
            options.password.username.val(username);
            // Toggle the forms
            options.username.container.addClass('hide');
            options.password.container.removeClass('hide');
            document.getElementById("id_password").focus();
        }
    }

    /**
     * Redirects to local_signin on a different domain.
     *
     * @param response
     * @param username
     */
    function redirect(response, username) {
        window.location = window.location.protocol +'//' + response.domain +
                          '/local/signin/index.php?username=' + username;
    }

    /**
     * Issues a notification.
     *
     * @param notification_type - ('success', 'info', 'warning', 'danger')
     * @param string_ref - Pointer for lang/.../local_signin.php string
     */
    function getStringAndNotify(notification_type, string_ref){
        var string = str.get_string(string_ref, 'local_signin', null);
        $.when(string).done(function (string) {
            notify(notification_type, string);
        });
    }

    /**
     * Goes on to show the password form (when the domain webservice is not available).
     *
     * @param options
     */
    function noWebService(options) {
        var username = options.username.input.val();
        options.password.username.val(username);
        options.password.changeuser.click();
    }

    /**
     *
     * @param type - ('Success', 'info', 'warning', 'danger')
     * @param message - Message to be displayed
     */
    function notify(type, message) {
        $(defaults.form.alert).alert('close');
        $('<div>')
            .addClass('alert alert-' + type + ' nouser')
            .text(message)
            .appendTo(options.form.errors)
    }

    /**
     * Toggles the username and password forms.
     *
     * @param event
     */
    function toggleForms(event) {
        event.preventDefault();
        var options = event.data;
        options.password.container.addClass('hide');
        options.username.container.removeClass('hide');
    }
});
