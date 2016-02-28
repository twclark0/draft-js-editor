/**
 * Copyright (c) 2013-present, Facebook, Inc. All rights reserved.
 *
 * This file provided by Facebook is for non-commercial testing and evaluation
 * purposes only. Facebook reserves all rights not expressly granted.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 * FACEBOOK BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
 * ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
 * CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

'use strict';

import Draft from 'draft-js';
import {Map} from 'immutable';
import React from 'react';

import MediaComponent from './MediaComponent';
import {content} from '../data/content';
import insertMediaBlock from '../modifiers/insertMediaBlock';
import removeMediaBlock from '../modifiers/removeMediaBlock';
import SideControl from './SideControl'

var {ContentState, Editor, EditorState, RichUtils} = Draft;

const styles = {
  editorContainer: {
    position: 'relative',
    paddingLeft: 48,
  }
}

export default class RichEditor extends React.Component {
  constructor(props) {
    super(props);
    const contentState = ContentState.createFromBlockArray(content);
    this.state = {
      editorState: EditorState.createWithContent(contentState),
      liveTeXEdits: Map(),
    };

    this._blockRenderer = (block) => {

      if (block.getType() === 'media') {
        return {
          component: MediaComponent,
          props: {
            onStartEdit: (blockKey) => {
              var {liveTeXEdits} = this.state;
              this.setState({liveTeXEdits: liveTeXEdits.set(blockKey, true)});
            },
            onFinishEdit: (blockKey) => {
              var {liveTeXEdits} = this.state;
              this.setState({liveTeXEdits: liveTeXEdits.remove(blockKey)});
            },
            onRemove: (blockKey) => this._removeTeX(blockKey),
          },
        };
      }
      return null;
    };

    this._focus = () => this.refs.editor.focus();
    this._onChange = (editorState) => {

      this.setState({
        editorState,
      })

      // Calling this right away doesn't always seem to be reliable. It 
      // sometimes selects the first block when the user has focus on a block
      // later on in the series. Although setting the state twice is less than
      // ideal
      setTimeout(() => {
        var selectedBlock = this._getSelectedBlockElement()
        //console.log(selectedBlock)
        this.setState({
          selectedBlock,
        });
      }, 4)
    }

    this._getSelectedBlockElement = () => {
      var selection = window.getSelection()
      if (selection.rangeCount == 0) return null
      var node = selection.getRangeAt(0).startContainer
      do {
        if (node.getAttribute && node.getAttribute('data-block') == 'true')
          return node
        node = node.parentNode
      } while (node != null)
      return null
    };

    this._handleKeyCommand = command => {
      var {editorState} = this.state;
      var newState = RichUtils.handleKeyCommand(editorState, command);
      if (newState) {
        this._onChange(newState);
        return true;
      }
      return false;
    };

    this._removeTeX = (blockKey) => {
      var {editorState, liveTeXEdits} = this.state;
      this.setState({
        liveTeXEdits: liveTeXEdits.remove(blockKey),
        editorState: removeMediaBlock(editorState, blockKey),
      });
    };

    this._insertTeX = (file) => {
      this.setState({
        liveTeXEdits: Map(),
        editorState: insertMediaBlock(this.state.editorState, file),
      });
    };

    this.handleFileInput = (e) => {
      var fileList = e.target.files
      for (var i = 0; i < fileList.length; i++) {
        var file = fileList[i]
        this._insertTeX(file)
      }
    };
  };

  toggleBlockType = (blockType) => {
    this.onEditorChange(
      RichUtils.toggleBlockType(this.state.editorState, blockType));
  };

  onEditorChange = (editorState) => {
    this.setState({editorState});
  };

  /**
   * While editing TeX, set the Draft editor to read-only. This allows us to
   * have a textarea within the DOM.
   */
  render() {


    var editorState = this.state.editorState

    var currentStyle = editorState.getCurrentInlineStyle();

    const selection = editorState.getSelection();
    const selectedBlockType = editorState
      .getCurrentContent()
      .getBlockForKey(selection.getStartKey())
      .getType();

    return (
      <div className="TexEditor-container">
        <div className="TeXEditor-root">
          <div style={styles.editorContainer} 
            className="TeXEditor-editor" onClick={this._focus}>
            <SideControl style={{
                top: this.state.selectedBlock ? this.state.selectedBlock.offsetTop + 29 : 0,
                display: this.state.selectedBlock ? 'block' : 'none',
              }} 
              onImageClick={() => this.refs['fileInput'].click()}
              toggleBlockType={type => this.toggleBlockType(type)}
              selectedBlockType={selectedBlockType}
            />
            <Editor
              blockRendererFn={this._blockRenderer}
              editorState={this.state.editorState}
              handleKeyCommand={this._handleKeyCommand}
              onChange={this._onChange}
              placeholder="Start a document..."
              readOnly={this.state.liveTeXEdits.count()}
              ref="editor"
              spellCheck={true}
            />
          </div>
        </div>
        <input type="file" ref="fileInput" style={{display: 'none'}} 
          onChange={this.handleFileInput} />
      </div>
    );
  }
}
